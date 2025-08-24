import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { WalletService } from "./services/walletService";
import { TokenService } from "./services/tokenService";
import { frontendWalletSchema, insertTransactionSchema, insertMassSendOperationSchema, customNetworkSchema } from "@shared/schema";
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

  // Tokens endpoint
  app.get("/api/tokens/:network", async (req, res) => {
    try {
      const { network } = req.params;
      const tokens = TokenService.getTokensForNetwork(network);
      res.json(tokens);
    } catch (error) {
      console.error("Error fetching tokens:", error);
      res.status(500).json({ message: "Failed to fetch tokens" });
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
      console.log('Received wallet data:', req.body);
      const walletData = frontendWalletSchema.parse(req.body);

      // Validate private key
      if (!WalletService.validatePrivateKey(walletData.privateKey)) {
        return res.status(400).json({ message: "Invalid private key format" });
      }

      // Get address from private key
      const address = WalletService.getAddressFromPrivateKey(walletData.privateKey);
      
      // Encrypt private key
      const encryptedPrivateKey = WalletService.encryptPrivateKey(walletData.privateKey);

      // Get initial balance
      const balance = await WalletService.getBalance(address, walletData.network);

      const wallet = await storage.createWallet({
        name: walletData.name,
        network: walletData.network,
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

  // Custom network routes
  app.get("/api/custom-networks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const networks = await storage.getUserCustomNetworks(userId);
      res.json(networks);
    } catch (error) {
      console.error("Error fetching custom networks:", error);
      res.status(500).json({ message: "Failed to fetch custom networks" });
    }
  });

  app.post("/api/custom-networks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const networkData = customNetworkSchema.parse(req.body);

      const network = await storage.createCustomNetwork({
        ...networkData,
        userId,
      });

      res.json(network);
    } catch (error) {
      console.error("Error creating custom network:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid network data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create custom network" });
    }
  });

  app.delete("/api/custom-networks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const networkId = req.params.id;

      await storage.deleteCustomNetwork(networkId, userId);
      res.json({ message: "Custom network deleted successfully" });
    } catch (error) {
      console.error("Error deleting custom network:", error);
      res.status(500).json({ message: "Failed to delete custom network" });
    }
  });

  // Network info route
  app.get("/api/networks", async (req, res) => {
    try {
      const networks = [
        { id: "sepolia", name: "Ethereum Sepolia", symbol: "ETH", isTestnet: true, chainId: 11155111 },
        { id: "goerli", name: "Ethereum Goerli", symbol: "ETH", isTestnet: true, chainId: 5 },
        { id: "mainnet", name: "Ethereum Mainnet", symbol: "ETH", isTestnet: false, chainId: 1 },
        { id: "polygon_mumbai", name: "Polygon Mumbai", symbol: "MATIC", isTestnet: true, chainId: 80001 },
        { id: "polygon", name: "Polygon Mainnet", symbol: "MATIC", isTestnet: false, chainId: 137 },
        { id: "bsc_testnet", name: "BSC Testnet", symbol: "BNB", isTestnet: true, chainId: 97 },
        { id: "bsc", name: "BSC Mainnet", symbol: "BNB", isTestnet: false, chainId: 56 },
        { id: "arbitrum_goerli", name: "Arbitrum Goerli", symbol: "ETH", isTestnet: true, chainId: 421613 },
        { id: "arbitrum", name: "Arbitrum One", symbol: "ETH", isTestnet: false, chainId: 42161 },
        { id: "optimism_goerli", name: "Optimism Goerli", symbol: "ETH", isTestnet: true, chainId: 420 },
        { id: "optimism", name: "Optimism Mainnet", symbol: "ETH", isTestnet: false, chainId: 10 },
        { id: "avalanche_fuji", name: "Avalanche Fuji", symbol: "AVAX", isTestnet: true, chainId: 43113 },
        { id: "avalanche", name: "Avalanche C-Chain", symbol: "AVAX", isTestnet: false, chainId: 43114 },
        { id: "monad_testnet", name: "Monad Testnet", symbol: "MON", isTestnet: true, chainId: 41454 },
        { id: "base_sepolia", name: "Base Sepolia", symbol: "ETH", isTestnet: true, chainId: 84532 },
        { id: "base", name: "Base Mainnet", symbol: "ETH", isTestnet: false, chainId: 8453 },
        { id: "fantom_testnet", name: "Fantom Testnet", symbol: "FTM", isTestnet: true, chainId: 4002 },
        { id: "fantom", name: "Fantom Opera", symbol: "FTM", isTestnet: false, chainId: 250 },
        { id: "celo_alfajores", name: "Celo Alfajores", symbol: "CELO", isTestnet: true, chainId: 44787 },
        { id: "celo", name: "Celo Mainnet", symbol: "CELO", isTestnet: false, chainId: 42220 },
        { id: "linea_testnet", name: "Linea Testnet", symbol: "ETH", isTestnet: true, chainId: 59140 },
        { id: "linea", name: "Linea Mainnet", symbol: "ETH", isTestnet: false, chainId: 59144 },
      ];
      res.json(networks);
    } catch (error) {
      console.error("Error fetching networks:", error);
      res.status(500).json({ message: "Failed to fetch networks" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
