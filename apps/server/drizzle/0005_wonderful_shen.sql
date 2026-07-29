CREATE TABLE `players` (
	`id` text PRIMARY KEY NOT NULL,
	`auction_session_id` text NOT NULL,
	`fms_code` text NOT NULL,
	`name` text NOT NULL,
	`normalized_name` text NOT NULL,
	`role` text NOT NULL,
	`availability_status` text DEFAULT 'AVAILABLE' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`auction_session_id`) REFERENCES `auction_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `players_session_fms_code_unique` ON `players` (`auction_session_id`,`fms_code`);--> statement-breakpoint
CREATE UNIQUE INDEX `players_session_normalized_name_unique` ON `players` (`auction_session_id`,`normalized_name`);--> statement-breakpoint
CREATE TABLE `roster_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`auction_session_team_id` text NOT NULL,
	`player_id` text NOT NULL,
	`acquisition_cost` integer NOT NULL,
	`contract_year` integer NOT NULL,
	`source` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`auction_session_team_id`) REFERENCES `auction_session_teams`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "roster_entries_acquisition_cost_positive" CHECK("roster_entries"."acquisition_cost" >= 1),
	CONSTRAINT "roster_entries_contract_year_range" CHECK("roster_entries"."contract_year" BETWEEN 1 AND 3)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `roster_entries_player_unique` ON `roster_entries` (`player_id`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_auction_session_teams` (
	`id` text PRIMARY KEY NOT NULL,
	`auction_session_id` text NOT NULL,
	`team_id` text NOT NULL,
	`table_order` integer NOT NULL,
	`renewal_credits` integer DEFAULT 0 NOT NULL,
	`remaining_credits` integer NOT NULL,
	FOREIGN KEY (`auction_session_id`) REFERENCES `auction_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "auction_session_teams_table_order_range" CHECK("__new_auction_session_teams"."table_order" BETWEEN 1 AND 8),
	CONSTRAINT "auction_session_teams_renewal_credits_nonnegative" CHECK("__new_auction_session_teams"."renewal_credits" >= 0),
	CONSTRAINT "auction_session_teams_remaining_credits_nonnegative" CHECK("__new_auction_session_teams"."remaining_credits" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_auction_session_teams`(
    "id",
    "auction_session_id",
    "team_id",
    "table_order",
    "renewal_credits",
    "remaining_credits"
)
SELECT
    lower(hex(randomblob(4))) || '-' ||
    lower(hex(randomblob(2))) || '-' ||
    '4' || substr(lower(hex(randomblob(2))), 2) || '-' ||
    substr('89ab', abs(random()) % 4 + 1, 1) ||
    substr(lower(hex(randomblob(2))), 2) || '-' ||
    lower(hex(randomblob(6))),
    "auction_session_id",
    "team_id",
    "table_order",
    "renewal_credits",
    "remaining_credits"
FROM `auction_session_teams`;
--> statement-breakpoint
DROP TABLE `auction_session_teams`;--> statement-breakpoint
ALTER TABLE `__new_auction_session_teams` RENAME TO `auction_session_teams`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `auction_session_teams_session_team_unique` ON `auction_session_teams` (`auction_session_id`,`team_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `auction_session_teams_table_order_unique` ON `auction_session_teams` (`auction_session_id`,`table_order`);