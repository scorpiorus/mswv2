import { ethers } from "ethers";
import { CryptoService } from "./cryptoService";
import { TokenService } from "./tokenService";
import { storage } from "../storage";

export class WalletService {
  private static async getProvider(network: string = "sepolia", customNetworkId?: string): Promise<ethers.JsonRpcProvider> {
    // Handle custom network
    if (network === "custom" && customNetworkId) {
      const customNetwork = await storage.getCustomNetwork(customNetworkId);
      if (!customNetwork) {
        throw new Error("Custom network not found");
      }
      return new ethers.JsonRpcProvider(customNetwork.rpcUrl);
    }

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
      monad_testnet: process.env.MONAD_TESTNET_RPC_URL || "https://testnet-rpc.monad.xyz",
      base_sepolia: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
      base: process.env.BASE_RPC_URL || "https://mainnet.base.org",
      fantom_testnet: process.env.FANTOM_TESTNET_RPC_URL || "https://rpc.testnet.fantom.network",
      fantom: process.env.FANTOM_RPC_URL || "https://rpc.ftm.tools",
      celo_alfajores: process.env.CELO_ALFAJORES_RPC_URL || "https://alfajores-forno.celo-testnet.org",
      celo: process.env.CELO_RPC_URL || "https://forno.celo.org",
      linea_testnet: process.env.LINEA_TESTNET_RPC_URL || "https://rpc.goerli.linea.build",
      linea: process.env.LINEA_RPC_URL || "https://rpc.linea.build",
    };

    const rpcUrl = rpcUrls[network];
    if (!rpcUrl) {
      throw new Error(`Unsupported network: ${network}`);
    }

    return new ethers.JsonRpcProvider(rpcUrl);
  }

  static async getWalletFromPrivateKey(privateKey: string, network: string = "sepolia", customNetworkId?: string): Promise<ethers.Wallet> {
    const provider = await this.getProvider(network, customNetworkId);
    
    // Remove 0x prefix if present
    const cleanPrivateKey = privateKey.startsWith("0x") ? privateKey.slice(2) : privateKey;
    
    // Validate private key format
    if (!/^[a-fA-F0-9]{64}$/.test(cleanPrivateKey)) {
      throw new Error("Invalid private key format");
    }

    return new ethers.Wallet("0x" + cleanPrivateKey, provider);
  }

  static async getBalance(address: string, network: string = "sepolia", tokenSymbol: string = "ETH", customNetworkId?: string): Promise<string> {
    try {
      const provider = await this.getProvider(network, customNetworkId);
      
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
    network: string = "sepolia",
    customNetworkId?: string
  ): Promise<{ hash: string; gasUsed?: string; gasPrice?: string }> {
    try {
      const wallet = await this.getWalletFromPrivateKey(privateKey, network, customNetworkId);
      
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
    network: string = "sepolia",
    customNetworkId?: string
  ): Promise<string> {
    try {
      const wallet = await this.getWalletFromPrivateKey(privateKey, network, customNetworkId);
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

  static getNetworkDisplayName(network: string): string {
    const networkNames: Record<string, string> = {
      sepolia: "Ethereum Sepolia",
      goerli: "Ethereum Goerli",
      mainnet: "Ethereum Mainnet",
      polygon_mumbai: "Polygon Mumbai",
      polygon: "Polygon Mainnet",
      bsc_testnet: "BSC Testnet",
      bsc: "BSC Mainnet",
      arbitrum_goerli: "Arbitrum Goerli",
      arbitrum: "Arbitrum One",
      optimism_goerli: "Optimism Goerli",
      optimism: "Optimism Mainnet",
      avalanche_fuji: "Avalanche Fuji",
      avalanche: "Avalanche C-Chain",
      monad_testnet: "Monad Testnet",
      base_sepolia: "Base Sepolia",
      base: "Base Mainnet",
      fantom_testnet: "Fantom Testnet",
      fantom: "Fantom Opera",
      celo_alfajores: "Celo Alfajores",
      celo: "Celo Mainnet",
      linea_testnet: "Linea Testnet",
      linea: "Linea Mainnet",
      custom: "Custom Network",
    };
    return networkNames[network] || network;
  }

  static getChainId(network: string): number {
    const chainIds: Record<string, number> = {
      sepolia: 11155111,
      goerli: 5,
      mainnet: 1,
      polygon_mumbai: 80001,
      polygon: 137,
      bsc_testnet: 97,
      bsc: 56,
      arbitrum_goerli: 421613,
      arbitrum: 42161,
      optimism_goerli: 420,
      optimism: 10,
      avalanche_fuji: 43113,
      avalanche: 43114,
      monad_testnet: 41454,
      base_sepolia: 84532,
      base: 8453,
      fantom_testnet: 4002,
      fantom: 250,
      celo_alfajores: 44787,
      celo: 42220,
      linea_testnet: 59140,
      linea: 59144,
    };
    return chainIds[network] || 1;
  }
}
