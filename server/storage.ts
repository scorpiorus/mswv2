import {
  users,
  wallets,
  transactions,
  massSendOperations,
  customNetworks,
  type User,
  type UpsertUser,
  type Wallet,
  type InsertWallet,
  type Transaction,
  type InsertTransaction,
  type MassSendOperation,
  type InsertMassSendOperation,
  type CustomNetwork,
  type InsertCustomNetwork,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Wallet operations
  getUserWallets(userId: string): Promise<Wallet[]>;
  createWallet(wallet: InsertWallet): Promise<Wallet>;
  getWallet(id: string, userId: string): Promise<Wallet | undefined>;
  updateWalletBalance(id: string, balance: string): Promise<void>;
  deleteWallet(id: string, userId: string): Promise<void>;
  
  // Transaction operations
  getUserTransactions(userId: string): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: string, updates: Partial<Transaction>): Promise<void>;
  
  // Mass send operations
  createMassSendOperation(operation: InsertMassSendOperation): Promise<MassSendOperation>;
  updateMassSendOperation(id: string, updates: Partial<MassSendOperation>): Promise<void>;
  
  // Custom network operations
  getUserCustomNetworks(userId: string): Promise<CustomNetwork[]>;
  createCustomNetwork(network: InsertCustomNetwork): Promise<CustomNetwork>;
  getCustomNetwork(id: string): Promise<CustomNetwork | undefined>;
  deleteCustomNetwork(id: string, userId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Wallet operations
  async getUserWallets(userId: string): Promise<Wallet[]> {
    return await db
      .select()
      .from(wallets)
      .where(eq(wallets.userId, userId))
      .orderBy(desc(wallets.createdAt));
  }

  async createWallet(wallet: InsertWallet): Promise<Wallet> {
    const [newWallet] = await db
      .insert(wallets)
      .values(wallet)
      .returning();
    return newWallet;
  }

  async getWallet(id: string, userId: string): Promise<Wallet | undefined> {
    const [wallet] = await db
      .select()
      .from(wallets)
      .where(and(eq(wallets.id, id), eq(wallets.userId, userId)));
    return wallet;
  }

  async updateWalletBalance(id: string, balance: string): Promise<void> {
    await db
      .update(wallets)
      .set({ balance, updatedAt: new Date() })
      .where(eq(wallets.id, id));
  }

  async deleteWallet(id: string, userId: string): Promise<void> {
    await db
      .delete(wallets)
      .where(and(eq(wallets.id, id), eq(wallets.userId, userId)));
  }

  // Transaction operations
  async getUserTransactions(userId: string): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt));
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [newTransaction] = await db
      .insert(transactions)
      .values(transaction)
      .returning();
    return newTransaction;
  }

  async updateTransaction(id: string, updates: Partial<Transaction>): Promise<void> {
    await db
      .update(transactions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(transactions.id, id));
  }

  // Mass send operations
  async createMassSendOperation(operation: InsertMassSendOperation): Promise<MassSendOperation> {
    const [newOperation] = await db
      .insert(massSendOperations)
      .values(operation)
      .returning();
    return newOperation;
  }

  async updateMassSendOperation(id: string, updates: Partial<MassSendOperation>): Promise<void> {
    await db
      .update(massSendOperations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(massSendOperations.id, id));
  }

  // Custom network operations
  async getUserCustomNetworks(userId: string): Promise<CustomNetwork[]> {
    return await db
      .select()
      .from(customNetworks)
      .where(eq(customNetworks.userId, userId))
      .orderBy(desc(customNetworks.createdAt));
  }

  async createCustomNetwork(network: InsertCustomNetwork): Promise<CustomNetwork> {
    const [newNetwork] = await db
      .insert(customNetworks)
      .values(network)
      .returning();
    return newNetwork;
  }

  async getCustomNetwork(id: string): Promise<CustomNetwork | undefined> {
    const [network] = await db
      .select()
      .from(customNetworks)
      .where(eq(customNetworks.id, id));
    return network;
  }

  async deleteCustomNetwork(id: string, userId: string): Promise<void> {
    await db
      .delete(customNetworks)
      .where(and(eq(customNetworks.id, id), eq(customNetworks.userId, userId)));
  }
}

export const storage = new DatabaseStorage();
