import { ethers } from "ethers";
import { CryptoService } from "./cryptoService";
import { TokenService } from "./tokenService";

export class WalletService {
  private static getProvider(network: string = "sepolia"): ethers.JsonRpcProvider {
    const rpcUrls: Record<string, string> = {
      sepolia: process.env.SEPOLIA_RPC_URL || "https://1rpc.io/sepolia",
      goerli: process.env.GOERLI_RPC_URL || "https://rpc.ankr.com/eth_goerli",
      mainnet: process.env.MAINNET_RPC_URL || "https://1rpc.io/eth",
      polygon_mumbai: process.env.POLYGON_MUMBAI_RPC_URL || "https://rpc.ankr.com/polygon_mumbai",
      polygon: process.env.POLYGON_RPC_URL || "https://1rpc.io/matic",
      bsc_testnet: process.env.BSC_TESTNET_RPC_URL || "https://data-seed-prebsc-1-s1.binance.org:8545",
      bsc: process.env.BSC_RPC_URL || "https://1rpc.io/bnb",
      arbitrum_goerli: process.env.ARBITRUM_GOERLI_RPC_URL || "https://goerli-rollup.arbitrum.io/rpc",
      arbitrum: process.env.ARBITRUM_RPC_URL || "https://1rpc.io/arb",
      optimism_goerli: process.env.OPTIMISM_GOERLI_RPC_URL || "https://goerli.optimism.io",
      optimism: process.env.OPTIMISM_RPC_URL || "https://1rpc.io/op",
      avalanche_fuji: process.env.AVALANCHE_FUJI_RPC_URL || "https://api.avax-test.network/ext/bc/C/rpc",
      avalanche: process.env.AVALANCHE_RPC_URL || "https://1rpc.io/avax/c",
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

  static async getBalance(address: string, network: string = "sepolia", tokenSymbol: string = "ETH"): Promise<string> {
    try {
      const provider = this.getProvider(network);
      
      // Get token info
      const token = TokenService.getTokenBySymbol(network, tokenSymbol);
      if (!token) {
        console.error(`Token ${tokenSymbol} not found for network ${network}`);
        return "0";
      }

      if (TokenService.isNativeToken(network, tokenSymbol)) {
        // Native token balance
        const balance = await provider.getBalance(address);
        return ethers.formatEther(balance);
      } else {
        // ERC20 token balance
        const erc20Abi = [
          "function balanceOf(address owner) view returns (uint256)",
          "function decimals() view returns (uint8)"
        ];
        
        const contract = new ethers.Contract(token.address!, erc20Abi, provider);
        const balance = await contract.balanceOf(address);
        const decimals = await contract.decimals();
        
        return ethers.formatUnits(balance, decimals);
      }
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
