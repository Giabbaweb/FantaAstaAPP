PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_auction_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`league_id` text NOT NULL,
	`season` text NOT NULL,
	`edition_number` integer NOT NULL,
	`status` text DEFAULT 'SETUP' NOT NULL,
	`initial_credits` integer DEFAULT 330 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`league_id`) REFERENCES `leagues`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
DROP TABLE `auction_sessions`;--> statement-breakpoint
ALTER TABLE `__new_auction_sessions` RENAME TO `auction_sessions`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `auction_sessions_league_season_unique` ON `auction_sessions` (`league_id`,`season`);