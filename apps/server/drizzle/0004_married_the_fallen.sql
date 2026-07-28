CREATE TABLE `auction_session_teams` (
	`auction_session_id` text NOT NULL,
	`team_id` text NOT NULL,
	`table_order` integer NOT NULL,
	`renewal_credits` integer DEFAULT 0 NOT NULL,
	`remaining_credits` integer NOT NULL,
	PRIMARY KEY(`auction_session_id`, `team_id`),
	FOREIGN KEY (`auction_session_id`) REFERENCES `auction_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "auction_session_teams_table_order_range" CHECK("auction_session_teams"."table_order" BETWEEN 1 AND 8),
	CONSTRAINT "auction_session_teams_renewal_credits_nonnegative" CHECK("auction_session_teams"."renewal_credits" >= 0),
	CONSTRAINT "auction_session_teams_remaining_credits_nonnegative" CHECK("auction_session_teams"."remaining_credits" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `auction_session_teams_table_order_unique` ON `auction_session_teams` (`auction_session_id`,`table_order`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_teams` (
	`id` text PRIMARY KEY NOT NULL,
	`league_id` text NOT NULL,
	`name` text NOT NULL,
	`short_name` text,
	`primary_color` text,
	`secondary_color` text,
	`logo_path` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`league_id`) REFERENCES `leagues`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
DROP TABLE `teams`;--> statement-breakpoint
ALTER TABLE `__new_teams` RENAME TO `teams`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `teams_league_name_unique` ON `teams` (`league_id`,`name`);--> statement-breakpoint
ALTER TABLE `owners` ADD `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL;--> statement-breakpoint
CREATE TABLE `__new_auction_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`league_id` text NOT NULL,
	`season` text NOT NULL,
	`edition_number` integer NOT NULL,
	`status` text DEFAULT 'SETUP' NOT NULL,
	`initial_credits` integer DEFAULT 330 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`league_id`) REFERENCES `leagues`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "auction_sessions_initial_credits_nonnegative" CHECK("__new_auction_sessions"."initial_credits" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_auction_sessions`("id", "league_id", "season", "edition_number", "status", "initial_credits", "created_at", "updated_at") SELECT "id", "league_id", "season", "edition_number", "status", "initial_credits", "created_at", "updated_at" FROM `auction_sessions`;--> statement-breakpoint
DROP TABLE `auction_sessions`;--> statement-breakpoint
ALTER TABLE `__new_auction_sessions` RENAME TO `auction_sessions`;--> statement-breakpoint
CREATE UNIQUE INDEX `auction_sessions_league_season_unique` ON `auction_sessions` (`league_id`,`season`);--> statement-breakpoint
CREATE UNIQUE INDEX `auction_sessions_league_edition_unique` ON `auction_sessions` (`league_id`,`edition_number`);
