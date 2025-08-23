import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  decimal,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Network enum
export const networkEnum = pgEnum("network", [
  "sepolia", 
  "goerli", 
  "mainnet",
  "polygon_mumbai",
  "polygon", 
  "bsc_testnet",
  "bsc",
  "arbitrum_goerli",
  "arbitrum",
  "optimism_goerli", 
  "optimism",
  "avalanche_fuji",
  "avalanche"
]);

// Wallets table
export const wallets = pgTable("wallets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  address: varchar("address").notNull(),
  encryptedPrivateKey: text("encrypted_private_key").notNull(),
  network: networkEnum("network").notNull().default("sepolia"),
  balance: decimal("balance", { precision: 36, scale: 18 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Transaction status enum
export const transactionStatusEnum = pgEnum("transaction_status", ["pending", "confirmed", "failed"]);

// Transaction type enum
export const transactionTypeEnum = pgEnum("transaction_type", ["send", "mass_send"]);

// Transactions table
export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: transactionTypeEnum("type").notNull(),
  fromWalletId: varchar("from_wallet_id").references(() => wallets.id, { onDelete: "set null" }),
  toAddress: varchar("to_address").notNull(),
  amount: decimal("amount", { precision: 36, scale: 18 }).notNull(),
  token: varchar("token").notNull().default("ETH"),
  network: networkEnum("network").notNull().default("sepolia"),
  txHash: varchar("tx_hash"),
  status: transactionStatusEnum("status").notNull().default("pending"),
  gasUsed: decimal("gas_used", { precision: 36, scale: 18 }),
  gasPrice: decimal("gas_price", { precision: 36, scale: 18 }),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Mass send operations table
export const massSendOperations = pgTable("mass_send_operations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  toAddress: varchar("to_address").notNull(),
  token: varchar("token").notNull().default("ETH"),
  network: networkEnum("network").notNull().default("sepolia"),
  totalAmount: decimal("total_amount", { precision: 36, scale: 18 }).notNull(),
  walletsCount: varchar("wallets_count").notNull(),
  status: transactionStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Frontend form schema
export const frontendWalletSchema = z.object({
  name: z.string().min(1, "Wallet name is required"),
  privateKey: z.string().min(1, "Private key is required").regex(/^(0x)?[a-fA-F0-9]{64}$/, "Invalid private key format"),
  network: z.enum([
    "sepolia", 
    "goerli", 
    "mainnet",
    "polygon_mumbai",
    "polygon", 
    "bsc_testnet",
    "bsc",
    "arbitrum_goerli",
    "arbitrum",
    "optimism_goerli", 
    "optimism",
    "avalanche_fuji",
    "avalanche"
  ]).default("sepolia"),
});

// Backend insert schema
export const insertWalletSchema = createInsertSchema(wallets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  balance: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMassSendOperationSchema = createInsertSchema(massSendOperations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Wallet = typeof wallets.$inferSelect;
export type InsertWallet = z.infer<typeof insertWalletSchema>;
export type FrontendWallet = z.infer<typeof frontendWalletSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type MassSendOperation = typeof massSendOperations.$inferSelect;
export type InsertMassSendOperation = z.infer<typeof insertMassSendOperationSchema>;
