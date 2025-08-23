import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { WalletService } from "./services/walletService";
import { insertWalletSchema, insertTransactionSchema, insertMassSendOperationSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Wallet routes
  app.get("/api/wallets", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const wallets = await storage.getUserWallets(userId);
      
      // Update balances
      const walletsWithBalances = await Promise.all(
        wallets.map(async (wallet) => {
          try {
            const balance = await WalletService.getBalance(wallet.address, wallet.network);
            await storage.updateWalletBalance(wallet.id, balance);
            return { ...wallet, balance };
          } catch (error) {
            console.error(`Error updating balance for wallet ${wallet.id}:`, error);
            return wallet;
          }
        })
      );

      res.json(walletsWithBalances);
    } catch (error) {
      console.error("Error fetching wallets:", error);
      res.status(500).json({ message: "Failed to fetch wallets" });
    }
  });

  app.post("/api/wallets", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const walletData = insertWalletSchema.parse(req.body);

      // Validate private key
      if (!WalletService.validatePrivateKey(walletData.encryptedPrivateKey)) {
        return res.status(400).json({ message: "Invalid private key format" });
      }

      // Get address from private key
      const address = WalletService.getAddressFromPrivateKey(walletData.encryptedPrivateKey);
      
      // Encrypt private key
      const encryptedPrivateKey = WalletService.encryptPrivateKey(walletData.encryptedPrivateKey);

      // Get initial balance
      const balance = await WalletService.getBalance(address, walletData.network);

      const wallet = await storage.createWallet({
        ...walletData,
        userId,
        address,
        encryptedPrivateKey,
      });

      // Update balance
      await storage.updateWalletBalance(wallet.id, balance);

      res.json({ ...wallet, balance });
    } catch (error) {
      console.error("Error creating wallet:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid wallet data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create wallet" });
    }
  });

  app.delete("/api/wallets/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const walletId = req.params.id;

      await storage.deleteWallet(walletId, userId);
      res.json({ message: "Wallet deleted successfully" });
    } catch (error) {
      console.error("Error deleting wallet:", error);
      res.status(500).json({ message: "Failed to delete wallet" });
    }
  });

  // Transaction routes
  app.get("/api/transactions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const transactions = await storage.getUserTransactions(userId);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.post("/api/transactions/send", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { fromWalletId, toAddress, amount, token = "ETH" } = req.body;

      // Get wallet
      const wallet = await storage.getWallet(fromWalletId, userId);
      if (!wallet) {
        return res.status(404).json({ message: "Wallet not found" });
      }

      // Decrypt private key
      const privateKey = WalletService.decryptPrivateKey(wallet.encryptedPrivateKey);

      // Create transaction record
      const transaction = await storage.createTransaction({
        userId,
        type: "send",
        fromWalletId,
        toAddress,
        amount,
        token,
        network: wallet.network,
        status: "pending",
      });

      try {
        // Send transaction
        const result = await WalletService.sendTransaction(
          privateKey,
          toAddress,
          amount,
          wallet.network
        );

        // Update transaction with hash and gas info
        await storage.updateTransaction(transaction.id, {
          txHash: result.hash,
          gasUsed: result.gasUsed,
          gasPrice: result.gasPrice,
          status: "confirmed",
        });

        res.json({ ...transaction, txHash: result.hash, status: "confirmed" });
      } catch (txError) {
        console.error("Transaction failed:", txError);
        
        // Update transaction with error
        await storage.updateTransaction(transaction.id, {
          status: "failed",
          errorMessage: txError instanceof Error ? txError.message : "Transaction failed",
        });

        res.status(400).json({ message: "Transaction failed", error: txError instanceof Error ? txError.message : "Unknown error" });
      }
    } catch (error) {
      console.error("Error sending transaction:", error);
      res.status(500).json({ message: "Failed to send transaction" });
    }
  });

  app.post("/api/transactions/mass-send", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { toAddress, token = "ETH", walletIds } = req.body;

      // Get all user wallets
      const allWallets = await storage.getUserWallets(userId);
      const selectedWallets = walletIds ? 
        allWallets.filter(w => walletIds.includes(w.id)) : 
        allWallets;

      if (selectedWallets.length === 0) {
        return res.status(400).json({ message: "No wallets selected" });
      }

      // Calculate total amount
      let totalAmount = "0";
      const results = [];

      // Create mass send operation record
      const operation = await storage.createMassSendOperation({
        userId,
        toAddress,
        token,
        network: selectedWallets[0].network,
        totalAmount: "0", // Will be updated
        walletsCount: selectedWallets.length.toString(),
        status: "pending",
      });

      for (const wallet of selectedWallets) {
        try {
          // Get current balance
          const balance = await WalletService.getBalance(wallet.address, wallet.network);
          
          if (parseFloat(balance) > 0.001) { // Keep some ETH for gas
            // Decrypt private key
            const privateKey = WalletService.decryptPrivateKey(wallet.encryptedPrivateKey);
            
            // Calculate amount to send (balance minus gas fee)
            const gasEstimate = await WalletService.estimateGas(privateKey, toAddress, balance, wallet.network);
            const amountToSend = (parseFloat(balance) - parseFloat(gasEstimate) - 0.001).toString();

            if (parseFloat(amountToSend) > 0) {
              // Create individual transaction record
              const transaction = await storage.createTransaction({
                userId,
                type: "mass_send",
                fromWalletId: wallet.id,
                toAddress,
                amount: amountToSend,
                token,
                network: wallet.network,
                status: "pending",
              });

              // Send transaction
              const result = await WalletService.sendTransaction(
                privateKey,
                toAddress,
                amountToSend,
                wallet.network
              );

              // Update transaction
              await storage.updateTransaction(transaction.id, {
                txHash: result.hash,
                gasUsed: result.gasUsed,
                gasPrice: result.gasPrice,
                status: "confirmed",
              });

              totalAmount = (parseFloat(totalAmount) + parseFloat(amountToSend)).toString();
              results.push({
                walletId: wallet.id,
                address: wallet.address,
                amount: amountToSend,
                txHash: result.hash,
                status: "confirmed",
              });
            }
          }
        } catch (error) {
          console.error(`Error sending from wallet ${wallet.id}:`, error);
          results.push({
            walletId: wallet.id,
            address: wallet.address,
            error: error instanceof Error ? error.message : "Unknown error",
            status: "failed",
          });
        }
      }

      // Update mass send operation
      await storage.updateMassSendOperation(operation.id, {
        totalAmount,
        status: results.some(r => r.status === "confirmed") ? "confirmed" : "failed",
      });

      res.json({
        operationId: operation.id,
        totalAmount,
        results,
        walletsProcessed: selectedWallets.length,
      });
    } catch (error) {
      console.error("Error in mass send:", error);
      res.status(500).json({ message: "Failed to execute mass send" });
    }
  });

  // Estimate gas route
  app.post("/api/estimate-gas", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { fromWalletId, toAddress, amount } = req.body;

      const wallet = await storage.getWallet(fromWalletId, userId);
      if (!wallet) {
        return res.status(404).json({ message: "Wallet not found" });
      }

      const privateKey = WalletService.decryptPrivateKey(wallet.encryptedPrivateKey);
      const gasEstimate = await WalletService.estimateGas(privateKey, toAddress, amount, wallet.network);

      res.json({ gasEstimate });
    } catch (error) {
      console.error("Error estimating gas:", error);
      res.status(500).json({ message: "Failed to estimate gas" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
