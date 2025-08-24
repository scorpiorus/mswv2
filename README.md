# CryptoWallet - Testnet Wallet Manager

A minimalist web application for managing Ethereum testnet wallets with support for multiple EVM networks and custom network configuration.

## Features

- 🔐 **Secure Wallet Management**: Import and manage multiple testnet wallets with encrypted private key storage
- 🌐 **Multi-Network Support**: Support for 20+ EVM networks including:
  - Ethereum (Sepolia, Goerli, Mainnet)
  - Polygon (Mumbai, Mainnet)
  - BSC (Testnet, Mainnet)
  - Arbitrum (Goerli, One)
  - Optimism (Goerli, Mainnet)
  - Avalanche (Fuji, C-Chain)
  - Monad Testnet
  - Base (Sepolia, Mainnet)
  - Fantom (Testnet, Opera)
  - Celo (Alfajores, Mainnet)
  - Linea (Testnet, Mainnet)
- ⚙️ **Custom Networks**: Add your own networks with custom RPC endpoints and Chain IDs
- 💸 **Transaction Management**: Send individual transactions and perform mass send operations
- 📊 **Transaction History**: Track all your transactions with detailed status information
- 🔍 **Real-time Balances**: Automatic balance updates and gas estimation
- 🔐 **Replit Authentication**: Secure user authentication and session management

## Tech Stack

- **Frontend**: React 18, TypeScript, TailwindCSS, Radix UI
- **Backend**: Express.js, TypeScript, Drizzle ORM
- **Database**: PostgreSQL (Neon serverless)
- **Blockchain**: ethers.js for EVM interactions
- **Authentication**: Replit Auth with OpenID Connect
- **Build Tools**: Vite, ESBuild

## Environment Variables

The following environment variables are required for production deployment:

### Required
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Secret key for session encryption
- `REPL_ID` - Replit application ID
- `REPLIT_DOMAINS` - Comma-separated list of domains

### Optional RPC URLs (will use public endpoints if not set)
- `SEPOLIA_RPC_URL`
- `GOERLI_RPC_URL`
- `MAINNET_RPC_URL`
- `POLYGON_MUMBAI_RPC_URL`
- `POLYGON_RPC_URL`
- `BSC_TESTNET_RPC_URL`
- `BSC_RPC_URL`
- `ARBITRUM_GOERLI_RPC_URL`
- `ARBITRUM_RPC_URL`
- `OPTIMISM_GOERLI_RPC_URL`
- `OPTIMISM_RPC_URL`
- `AVALANCHE_FUJI_RPC_URL`
- `AVALANCHE_RPC_URL`
- `MONAD_TESTNET_RPC_URL`
- `BASE_SEPOLIA_RPC_URL`
- `BASE_RPC_URL`
- `FANTOM_TESTNET_RPC_URL`
- `FANTOM_RPC_URL`
- `CELO_ALFAJORES_RPC_URL`
- `CELO_RPC_URL`
- `LINEA_TESTNET_RPC_URL`
- `LINEA_RPC_URL`

## Deployment to Vercel

### 1. Database Setup
First, set up a PostgreSQL database (recommended: Neon, Supabase, or Railway):

1. Create a new PostgreSQL database
2. Copy the connection string
3. Add it as `DATABASE_URL` environment variable in Vercel

### 2. Vercel Deployment
1. Push your code to GitHub
2. Import the repository in Vercel
3. Configure the following environment variables:
   - `DATABASE_URL` - Your PostgreSQL connection string
   - `SESSION_SECRET` - Generate with: `openssl rand -hex 32`
   - `REPL_ID` - Your application identifier
   - `REPLIT_DOMAINS` - Your domain(s)
   - `NODE_ENV` - Set to `production`

### 3. Database Migration
After deployment, run the database migration:
```bash
npm run db:push
```

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables in `.env`

3. Run database migration:
```bash
npm run db:push
```

4. Start development server:
```bash
npm run dev
```

## Security Features

- 🔐 Private keys encrypted with AES-256-GCM before database storage
- 🛡️ HTTP-only session cookies with secure flags
- 🔒 Route protection with authentication middleware
- 🌐 Environment-based configuration for sensitive data
- 🔑 Secure session management with PostgreSQL store

## License

MIT License - see LICENSE file for details.