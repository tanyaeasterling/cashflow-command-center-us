CREATE TABLE `alerts_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`reportId` int,
	`level` enum('critical','warning','info') NOT NULL,
	`category` varchar(64),
	`title` varchar(512) NOT NULL,
	`detail` text,
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	`resolved` boolean NOT NULL DEFAULT false,
	CONSTRAINT `alerts_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(64) NOT NULL,
	`config` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `clients_id` PRIMARY KEY(`id`),
	CONSTRAINT `clients_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `pf_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`weekLabel` varchar(32),
	`snapshotDate` date,
	`bucketData` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pf_snapshots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`reportType` varchar(64) NOT NULL,
	`periodStart` date,
	`periodEnd` date,
	`basis` enum('Cash','Accrual'),
	`filename` varchar(512),
	`uploadedBy` int,
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	`storageUrl` text,
	`parsedData` json,
	`superseded` boolean NOT NULL DEFAULT false,
	CONSTRAINT `reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`clientId` int NOT NULL,
	`tecRole` enum('admin','owner','bookkeeper','accountant') NOT NULL DEFAULT 'accountant',
	`fullName` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_profiles_id` PRIMARY KEY(`id`)
);
