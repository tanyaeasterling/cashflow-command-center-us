-- Migration: 0002_auth_audit_tier
-- Adds: email/password auth, Google OAuth, file audit trail,
--        client tier/delivery date, CASHFLOW letter on alerts,
--        access_log table, password_reset_tokens table

-- ─── users: add auth and OAuth columns ───────────────────────────────────────
ALTER TABLE `users`
  ADD COLUMN `passwordHash` varchar(255) AFTER `email`,
  ADD COLUMN `googleId` varchar(128) AFTER `passwordHash`,
  ADD COLUMN `avatarUrl` text AFTER `googleId`;

-- ─── clients: add tier and delivery date ─────────────────────────────────────
ALTER TABLE `clients`
  ADD COLUMN `tier` enum('delivery','retainer') NOT NULL DEFAULT 'delivery' AFTER `config`,
  ADD COLUMN `deliveryDate` date AFTER `tier`;

-- ─── reports: add audit trail columns ────────────────────────────────────────
ALTER TABLE `reports`
  ADD COLUMN `mimeType` varchar(128) AFTER `filename`,
  ADD COLUMN `fileSizeBytes` bigint AFTER `mimeType`,
  ADD COLUMN `fileHash` varchar(64) AFTER `fileSizeBytes`,
  ADD COLUMN `notes` text AFTER `superseded`;

-- ─── alerts_log: add CASHFLOW letter and resolved-by tracking ────────────────
ALTER TABLE `alerts_log`
  ADD COLUMN `cashflowLetter` varchar(1) AFTER `category`,
  ADD COLUMN `resolvedBy` int AFTER `resolved`,
  ADD COLUMN `resolvedAt` timestamp AFTER `resolvedBy`;

-- ─── access_log: full audit trail of every user action ───────────────────────
CREATE TABLE `access_log` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int,
  `clientId` int,
  `action` enum(
    'login','logout','upload','download','export',
    'alert_resolved','tier_changed','user_created',
    'user_role_changed','password_reset'
  ) NOT NULL,
  `detail` json,
  `ipAddress` varchar(45),
  `userAgent` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `access_log_id` PRIMARY KEY(`id`)
);

-- ─── password_reset_tokens ────────────────────────────────────────────────────
CREATE TABLE `password_reset_tokens` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `token` varchar(128) NOT NULL,
  `expiresAt` timestamp NOT NULL,
  `usedAt` timestamp,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `password_reset_tokens_id` PRIMARY KEY(`id`),
  CONSTRAINT `password_reset_tokens_token_unique` UNIQUE(`token`)
);
