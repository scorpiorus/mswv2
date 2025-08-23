import { ethers } from "ethers";

export interface TestnetToken {
  symbol: string;
  name: string;
  address: string | null; // null for native tokens
  decimals: number;
  network: string;
  faucetUrl?: string;
}

export class TokenService {
  static testnetTokens: Record<string, TestnetToken[]> = {
    sepolia: [
      {
        symbol: "ETH",
        name: "Ethereum",
        address: null,
        decimals: 18,
        network: "sepolia",
        faucetUrl: "https://sepoliafaucet.com/"
      },
      {
        symbol: "USDT",
        name: "Tether USD",
        address: "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0",
        decimals: 6,
        network: "sepolia"
      },
      {
        symbol: "USDC",
        name: "USD Coin",
        address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
        decimals: 6,
        network: "sepolia"
      }
    ],
    goerli: [
      {
        symbol: "ETH",
        name: "Ethereum",
        address: null,
        decimals: 18,
        network: "goerli",
        faucetUrl: "https://goerlifaucet.com/"
      },
      {
        symbol: "USDT",
        name: "Tether USD",
        address: "0x509Ee0d083DdF8AC028f2a56731412edD63223B9",
        decimals: 6,
        network: "goerli"
      }
    ],
    polygon_mumbai: [
      {
        symbol: "MATIC",
        name: "Polygon",
        address: null,
        decimals: 18,
        network: "polygon_mumbai",
        faucetUrl: "https://faucet.polygon.technology/"
      },
      {
        symbol: "USDT",
        name: "Tether USD",
        address: "0xBD21A10F619BE90d6066c941b04e4b3b9b3d7B1D",
        decimals: 6,
        network: "polygon_mumbai"
      },
      {
        symbol: "USDC",
        name: "USD Coin",
        address: "0x9999f7Fea5938fD3b1E26A12c3f2fb024e194f97",
        decimals: 6,
        network: "polygon_mumbai"
      }
    ],
    bsc_testnet: [
      {
        symbol: "BNB",
        name: "Binance Coin",
        address: null,
        decimals: 18,
        network: "bsc_testnet",
        faucetUrl: "https://testnet.binance.org/faucet-smart"
      },
      {
        symbol: "BUSD",
        name: "Binance USD",
        address: "0xeD24FC36d5Ee211Ea25A80239Fb8C4Cfd80f12Ee",
        decimals: 18,
        network: "bsc_testnet"
      }
    ],
    arbitrum_goerli: [
      {
        symbol: "ETH",
        name: "Ethereum",
        address: null,
        decimals: 18,
        network: "arbitrum_goerli",
        faucetUrl: "https://bridge.arbitrum.io/"
      }
    ],
    optimism_goerli: [
      {
        symbol: "ETH",
        name: "Ethereum",
        address: null,
        decimals: 18,
        network: "optimism_goerli",
        faucetUrl: "https://app.optimism.io/bridge"
      }
    ],
    avalanche_fuji: [
      {
        symbol: "AVAX",
        name: "Avalanche",
        address: null,
        decimals: 18,
        network: "avalanche_fuji",
        faucetUrl: "https://faucet.avax.network/"
      }
    ]
  };

  static getTokensForNetwork(network: string): TestnetToken[] {
    return this.testnetTokens[network] || [];
  }

  static getTokenBySymbol(network: string, symbol: string): TestnetToken | undefined {
    const tokens = this.getTokensForNetwork(network);
    return tokens.find(token => token.symbol === symbol);
  }

  static isNativeToken(network: string, symbol: string): boolean {
    const token = this.getTokenBySymbol(network, symbol);
    return token?.address === null;
  }

  static getDisplayBalance(balance: string, decimals: number = 18): string {
    if (decimals === 18) {
      return ethers.formatEther(balance);
    } else {
      return ethers.formatUnits(balance, decimals);
    }
  }

  static parseAmount(amount: string, decimals: number = 18): bigint {
    if (decimals === 18) {
      return ethers.parseEther(amount);
    } else {
      return ethers.parseUnits(amount, decimals);
    }
  }
}