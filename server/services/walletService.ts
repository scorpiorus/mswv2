import { ethers } from "ethers";
import { CryptoService } from "./cryptoService";

export class WalletService {
  private static getProvider(network: string = "sepolia"): ethers.JsonRpcProvider {
    const rpcUrls: Record<string, string> = {
      sepolia: process.env.SEPOLIA_RPC_URL || "https://eth-sepolia.g.alchemy.com/v2/demo",
      goerli: process.env.GOERLI_RPC_URL || "https://eth-goerli.g.alchemy.com/v2/demo",
      mainnet: process.env.MAINNET_RPC_URL || "https://eth-mainnet.g.alchemy.com/v2/demo",
    };

    return new ethers.JsonRpcProvider(rpcUrls[network]);
  }

  static async getWalletFromPrivateKey(privateKey: string, network: string = "sepolia"): Promise<ethers.Wallet> {
    const provider = this.getProvider(network);
    
    // Remove 0x prefix if present
    const cleanPrivateKey = privateKey.startsWith("0x") ? privateKey.slice(2) : privateKey;
    
    // Validate private key format
    if (!/^[a-fA-F0-9]{64}$/.test(cleanPrivateKey)) {
      throw new Error("Invalid private key format");
    }

    return new ethers.Wallet("0x" + cleanPrivateKey, provider);
  }

  static async getBalance(address: string, network: string = "sepolia"): Promise<string> {
    try {
      const provider = this.getProvider(network);
      const balance = await provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error("Error getting balance:", error);
      return "0";
    }
  }

  static async sendTransaction(
    privateKey: string,
    toAddress: string,
    amount: string,
    network: string = "sepolia"
  ): Promise<{ hash: string; gasUsed?: string; gasPrice?: string }> {
    try {
      const wallet = await this.getWalletFromPrivateKey(privateKey, network);
      
      // Validate recipient address
      if (!ethers.isAddress(toAddress)) {
        throw new Error("Invalid recipient address");
      }

      // Get current gas price
      const gasPrice = await wallet.provider!.getFeeData();
      
      // Create transaction
      const tx = {
        to: toAddress,
        value: ethers.parseEther(amount),
        gasPrice: gasPrice.gasPrice,
        gasLimit: BigInt(21000),
      };

      // Send transaction
      const txResponse = await wallet.sendTransaction(tx);
      const receipt = await txResponse.wait();

      return {
        hash: txResponse.hash,
        gasUsed: receipt?.gasUsed?.toString(),
        gasPrice: gasPrice.gasPrice?.toString(),
      };
    } catch (error) {
      console.error("Error sending transaction:", error);
      throw error;
    }
  }

  static async estimateGas(
    privateKey: string,
    toAddress: string,
    amount: string,
    network: string = "sepolia"
  ): Promise<string> {
    try {
      const wallet = await this.getWalletFromPrivateKey(privateKey, network);
      const gasPrice = await wallet.provider!.getFeeData();
      
      // Estimate gas for ETH transfer (typically 21000)
      const gasLimit = BigInt(21000);
      const estimatedFee = gasLimit * (gasPrice.gasPrice || BigInt(0));
      
      return ethers.formatEther(estimatedFee);
    } catch (error) {
      console.error("Error estimating gas:", error);
      return "0.002"; // Fallback estimate
    }
  }

  static encryptPrivateKey(privateKey: string): string {
    return CryptoService.encrypt(privateKey);
  }

  static decryptPrivateKey(encryptedPrivateKey: string): string {
    return CryptoService.decrypt(encryptedPrivateKey);
  }

  static validatePrivateKey(privateKey: string): boolean {
    try {
      const cleanPrivateKey = privateKey.startsWith("0x") ? privateKey.slice(2) : privateKey;
      return /^[a-fA-F0-9]{64}$/.test(cleanPrivateKey);
    } catch {
      return false;
    }
  }

  static getAddressFromPrivateKey(privateKey: string): string {
    try {
      const cleanPrivateKey = privateKey.startsWith("0x") ? privateKey.slice(2) : privateKey;
      const wallet = new ethers.Wallet("0x" + cleanPrivateKey);
      return wallet.address;
    } catch (error) {
      throw new Error("Invalid private key");
    }
  }
}
