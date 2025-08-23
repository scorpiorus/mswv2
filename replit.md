# CryptoWallet - Testnet Wallet Manager

## Overview

CryptoWallet is a minimalist web application for managing Ethereum testnet wallets. The application allows users to import private keys, manage multiple wallets, send individual transactions, and perform mass send operations across multiple wallets. Built with a React frontend and Express backend, it provides a clean interface for cryptocurrency operations on test networks (Sepolia, Goerli, Mainnet).

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Components**: Radix UI primitives with shadcn/ui component library for consistent design
- **Styling**: TailwindCSS with custom CSS variables for theming
- **State Management**: TanStack React Query for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation for type-safe form handling

### Backend Architecture
- **Framework**: Express.js with TypeScript running on Node.js
- **Database Layer**: Drizzle ORM with PostgreSQL for type-safe database operations
- **Authentication**: Replit Auth integration with OpenID Connect for user authentication
- **Session Management**: Express sessions with PostgreSQL session store
- **API Design**: RESTful endpoints with JSON responses and proper error handling

### Database Design
- **ORM**: Drizzle with schema-first approach for type safety
- **Tables**: Users, wallets, transactions, mass send operations, and session storage
- **Encryption**: Private keys are encrypted before storage using AES-256-GCM
- **Relationships**: Foreign key constraints with cascade deletion for data integrity

### Security Measures
- **Private Key Encryption**: All private keys are encrypted using AES-256-GCM before database storage
- **Environment Variables**: Sensitive data like encryption keys and database URLs stored as environment variables
- **Session Security**: HTTP-only cookies with secure flag and proper expiration
- **Authentication Middleware**: Route protection ensuring only authenticated users can access wallet operations

### Blockchain Integration
- **Ethereum Integration**: ethers.js library for blockchain interactions
- **Multi-Network Support**: Configurable RPC endpoints for Sepolia, Goerli, and Mainnet
- **Balance Tracking**: Real-time balance updates and caching for wallet addresses
- **Transaction Management**: Support for individual and batch transaction operations

## External Dependencies

### Core Framework Dependencies
- **React 18**: Frontend framework with hooks and modern features
- **Express.js**: Backend web framework for Node.js
- **TypeScript**: Type safety across the entire application stack
- **Vite**: Fast development server and build tool

### UI and Styling
- **Radix UI**: Headless UI components for accessibility and flexibility
- **TailwindCSS**: Utility-first CSS framework
- **Lucide React**: Icon library for consistent iconography
- **shadcn/ui**: Pre-built component library built on Radix UI

### Database and ORM
- **PostgreSQL**: Primary database (configured for Neon serverless)
- **Drizzle ORM**: Type-safe database toolkit and query builder
- **@neondatabase/serverless**: Serverless PostgreSQL driver

### Authentication
- **Replit Auth**: OAuth integration for user authentication
- **Passport.js**: Authentication middleware
- **OpenID Connect**: Standard protocol for authentication flows

### Blockchain and Crypto
- **ethers.js**: Ethereum library for blockchain interactions
- **Node.js crypto**: Built-in encryption for private key security

### Development and Build Tools
- **ESBuild**: Fast JavaScript bundler for production builds
- **tsx**: TypeScript execution for development
- **PostCSS**: CSS processing with Autoprefixer

### Session and Storage
- **express-session**: Session middleware for Express
- **connect-pg-simple**: PostgreSQL session store
- **ws**: WebSocket library for Neon database connections