PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_auction_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`league_id` text NOT NULL,
	`season` text NOT NULL,
	`edition_number` integer NOT NULL,
	`status` text DEFAULT 'SETUP' NOT NULL,
	`suspension_reason` text,
	`initial_credits` integer DEFAULT 330 NOT NULL,
	`maximum_initial_roster_entries` integer DEFAULT 11 NOT NULL,
	`state_version` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`league_id`) REFERENCES `leagues`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "auction_sessions_initial_credits_nonnegative" CHECK("__new_auction_sessions"."initial_credits" >= 0),
	CONSTRAINT "auction_sessions_maximum_initial_roster_entries_range" CHECK("__new_auction_sessions"."maximum_initial_roster_entries" >= 0 AND "__new_auction_sessions"."maximum_initial_roster_entries" <= 24)
);
--> statement-breakpoint
INSERT INTO `__new_auction_sessions`("id", "league_id", "season", "edition_number", "status", "suspension_reason", "initial_credits", "maximum_initial_roster_entries", "state_version", "created_at", "updated_at") SELECT "id", "league_id", "season", "edition_number", "status", "suspension_reason", "initial_credits", 11, "state_version", "created_at", "updated_at" FROM `auction_sessions`;--> statement-breakpoint
DROP TABLE `auction_sessions`;--> statement-breakpoint
ALTER TABLE `__new_auction_sessions` RENAME TO `auction_sessions`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `auction_sessions_league_season_unique` ON `auction_sessions` (`league_id`,`season`);--> statement-breakpoint
CREATE UNIQUE INDEX `auction_sessions_league_edition_unique` ON `auction_sessions` (`league_id`,`edition_number`);