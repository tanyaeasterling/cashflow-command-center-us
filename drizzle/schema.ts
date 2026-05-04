import {
  boolean,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  date,
  bigint,
} from "drizzle-orm/mysql-core";

// ─── Core users table ─────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  // Email/password auth
  passwordHash: varchar("passwordHash", { length: 255 }),
  // Google OAuth — populated when loginMethod = 'google'
  googleId: varchar("googleId", { length: 128 }),
  avatarUrl: text("avatarUrl"),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── TEC Clients (one row per consulting client) ──────────────────────────────
export const clients = mysqlTable("clients", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  config: json("config"),
  // 'delivery' = curated post-engagement view (base package)
  // 'retainer' = full dashboard, all tabs unlocked (paid upgrade)
  tier: mysqlEnum("tier", ["delivery", "retainer"]).default("delivery").notNull(),
  // deliveryDate starts the 90-day soft-expiration clock
  deliveryDate: date("deliveryDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

// ─── User profiles (links users to clients with TEC-specific roles) ───────────
export const userProfiles = mysqlTable("user_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  clientId: int("clientId").notNull(),
  tecRole: mysqlEnum("tecRole", ["admin", "owner", "bookkeeper", "accountant"]).notNull().default("accountant"),
  fullName: varchar("fullName", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = typeof userProfiles.$inferInsert;

// ─── Uploaded reports (one row per file upload) ───────────────────────────────
export const reports = mysqlTable("reports", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(),
  reportType: varchar("reportType", { length: 64 }).notNull(),
  periodStart: date("periodStart"),
  periodEnd: date("periodEnd"),
  basis: mysqlEnum("basis", ["Cash", "Accrual"]),
  filename: varchar("filename", { length: 512 }),
  // Audit trail fields
  mimeType: varchar("mimeType", { length: 128 }),
  fileSizeBytes: bigint("fileSizeBytes", { mode: "number" }),
  // SHA-256 of file content for deduplication and tamper detection
  fileHash: varchar("fileHash", { length: 64 }),
  uploadedBy: int("uploadedBy"),
  uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
  storageUrl: text("storageUrl"),
  parsedData: json("parsedData"),
  superseded: boolean("superseded").default(false).notNull(),
  // Admin can annotate any uploaded file
  notes: text("notes"),
});

export type Report = typeof reports.$inferSelect;
export type InsertReport = typeof reports.$inferInsert;

// ─── Alerts log ───────────────────────────────────────────────────────────────
export const alertsTable = mysqlTable("alerts_log", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(),
  reportId: int("reportId"),
  level: mysqlEnum("level", ["critical", "warning", "info"]).notNull(),
  category: varchar("category", { length: 64 }),
  // Which CASHFLOW letter this alert maps to (C/A/S/H/F/L/O/W)
  cashflowLetter: varchar("cashflowLetter", { length: 1 }),
  title: varchar("title", { length: 512 }).notNull(),
  detail: text("detail"),
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
  resolved: boolean("resolved").default(false).notNull(),
  resolvedBy: int("resolvedBy"),
  resolvedAt: timestamp("resolvedAt"),
});

export type AlertRow = typeof alertsTable.$inferSelect;
export type InsertAlertRow = typeof alertsTable.$inferInsert;

// ─── Weekly PF snapshots ──────────────────────────────────────────────────────
export const pfSnapshots = mysqlTable("pf_snapshots", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(),
  weekLabel: varchar("weekLabel", { length: 32 }),
  snapshotDate: date("snapshotDate"),
  bucketData: json("bucketData"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PfSnapshot = typeof pfSnapshots.$inferSelect;
export type InsertPfSnapshot = typeof pfSnapshots.$inferInsert;

// ─── Access log — full audit trail of every user action ──────────────────────
// Login, upload, download, export, role changes — everything is recorded here.
export const accessLog = mysqlTable("access_log", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  clientId: int("clientId"),
  action: mysqlEnum("action", [
    "login",
    "logout",
    "upload",
    "download",
    "export",
    "alert_resolved",
    "tier_changed",
    "user_created",
    "user_role_changed",
    "password_reset",
  ]).notNull(),
  // Flexible detail blob: stores filename, reportId, old/new role, etc.
  detail: json("detail"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AccessLogRow = typeof accessLog.$inferSelect;
export type InsertAccessLogRow = typeof accessLog.$inferInsert;

// ─── Password reset tokens ────────────────────────────────────────────────────
export const passwordResetTokens = mysqlTable("password_reset_tokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  token: varchar("token", { length: 128 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
