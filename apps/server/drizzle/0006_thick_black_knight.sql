CREATE TABLE `auction_call_teams` (
	`id` text PRIMARY KEY NOT NULL,
	`auction_call_id` text NOT NULL,
	`auction_session_team_id` text NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`maximum_bid` integer NOT NULL,
	`exclusion_reason` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`auction_call_id`) REFERENCES `auction_calls`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`auction_session_team_id`) REFERENCES `auction_session_teams`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "auction_call_teams_maximum_bid_nonnegative" CHECK("auction_call_teams"."maximum_bid" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `auction_call_teams_call_team_unique` ON `auction_call_teams` (`auction_call_id`,`auction_session_team_id`);--> statement-breakpoint
CREATE TABLE `auction_calls` (
	`id` text PRIMARY KEY NOT NULL,
	`auction_session_id` text NOT NULL,
	`player_id` text NOT NULL,
	`caller_auction_session_team_id` text NOT NULL,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`opening_bid` integer,
	`current_bid` integer,
	`current_leader_auction_session_team_id` text,
	`current_turn_auction_session_team_id` text,
	`provisional_winner_auction_session_team_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`auction_session_id`) REFERENCES `auction_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`caller_auction_session_team_id`) REFERENCES `auction_session_teams`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`current_leader_auction_session_team_id`) REFERENCES `auction_session_teams`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`current_turn_auction_session_team_id`) REFERENCES `auction_session_teams`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`provisional_winner_auction_session_team_id`) REFERENCES `auction_session_teams`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "auction_calls_opening_bid_positive" CHECK("auction_calls"."opening_bid" IS NULL OR "auction_calls"."opening_bid" >= 1),
	CONSTRAINT "auction_calls_current_bid_positive" CHECK("auction_calls"."current_bid" IS NULL OR "auction_calls"."current_bid" >= 1)
);
