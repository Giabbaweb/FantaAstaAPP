CREATE TABLE `auction_events` (
	`id` text PRIMARY KEY NOT NULL,
	`auction_session_id` text NOT NULL,
	`auction_call_id` text NOT NULL,
	`event_type` text NOT NULL,
	`auction_session_team_id` text NOT NULL,
	`player_id` text NOT NULL,
	`amount` integer NOT NULL,
	`credits_before` integer NOT NULL,
	`credits_after` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`auction_session_id`) REFERENCES `auction_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`auction_call_id`) REFERENCES `auction_calls`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`auction_session_team_id`) REFERENCES `auction_session_teams`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "auction_events_amount_positive" CHECK("auction_events"."amount" > 0),
	CONSTRAINT "auction_events_credits_before_nonnegative" CHECK("auction_events"."credits_before" >= 0),
	CONSTRAINT "auction_events_credits_after_nonnegative" CHECK("auction_events"."credits_after" >= 0),
	CONSTRAINT "auction_events_credit_balance" CHECK("auction_events"."credits_after" = "auction_events"."credits_before" - "auction_events"."amount")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `auction_events_call_type_unique` ON `auction_events` (`auction_call_id`,`event_type`);