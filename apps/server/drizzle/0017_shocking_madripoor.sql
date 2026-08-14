PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_auction_events` (
	`id` text PRIMARY KEY NOT NULL,
	`auction_session_id` text NOT NULL,
	`auction_call_id` text,
	`event_type` text NOT NULL,
	`auction_session_team_id` text,
	`player_id` text,
	`amount` integer,
	`credits_before` integer,
	`credits_after` integer,
	`contract_year` integer,
	`actor_name` text,
	`actor_role` text,
	`comment` text,
	`manual_assignment_reason` text,
	`suspension_reason` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`auction_session_id`) REFERENCES `auction_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`auction_call_id`) REFERENCES `auction_calls`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`auction_session_team_id`) REFERENCES `auction_session_teams`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "auction_events_shape_consistency" CHECK((
        (
          "__new_auction_events"."event_type" = 'AUCTION_AWARD_CONFIRMED'
          AND "__new_auction_events"."auction_call_id" IS NOT NULL
          AND "__new_auction_events"."auction_session_team_id" IS NOT NULL
          AND "__new_auction_events"."player_id" IS NOT NULL
          AND "__new_auction_events"."amount" IS NOT NULL
          AND "__new_auction_events"."credits_before" IS NOT NULL
          AND "__new_auction_events"."credits_after" IS NOT NULL
          AND "__new_auction_events"."contract_year" IS NULL
          AND "__new_auction_events"."actor_name" IS NULL
          AND "__new_auction_events"."actor_role" IS NULL
          AND "__new_auction_events"."comment" IS NULL
          AND "__new_auction_events"."manual_assignment_reason" IS NULL
          AND "__new_auction_events"."suspension_reason" IS NULL
        )
        OR
        (
          "__new_auction_events"."event_type" = 'INITIAL_ROSTER_ENTRY_ADDED_MANUALLY'
          AND "__new_auction_events"."auction_call_id" IS NULL
          AND "__new_auction_events"."auction_session_team_id" IS NOT NULL
          AND "__new_auction_events"."player_id" IS NOT NULL
          AND "__new_auction_events"."amount" IS NOT NULL
          AND "__new_auction_events"."credits_before" IS NOT NULL
          AND "__new_auction_events"."credits_after" IS NOT NULL
          AND "__new_auction_events"."contract_year" IS NOT NULL
          AND "__new_auction_events"."actor_name" IS NOT NULL
          AND "__new_auction_events"."actor_role" IS NOT NULL
          AND "__new_auction_events"."manual_assignment_reason" IS NULL
          AND "__new_auction_events"."suspension_reason" IS NULL
        )
        OR
        (
          "__new_auction_events"."event_type" = 'MANUAL_ROSTER_ASSIGNMENT_ADDED'
          AND "__new_auction_events"."auction_call_id" IS NULL
          AND "__new_auction_events"."auction_session_team_id" IS NOT NULL
          AND "__new_auction_events"."player_id" IS NOT NULL
          AND "__new_auction_events"."amount" IS NOT NULL
          AND "__new_auction_events"."credits_before" IS NOT NULL
          AND "__new_auction_events"."credits_after" IS NOT NULL
          AND "__new_auction_events"."contract_year" IS NOT NULL
          AND "__new_auction_events"."actor_name" IS NOT NULL
          AND "__new_auction_events"."actor_role" IS NOT NULL
          AND "__new_auction_events"."manual_assignment_reason" IS NOT NULL
          AND "__new_auction_events"."suspension_reason" IS NULL
        )
        OR
        (
          "__new_auction_events"."event_type" = 'SESSION_SUSPENDED'
          AND "__new_auction_events"."auction_call_id" IS NULL
          AND "__new_auction_events"."auction_session_team_id" IS NULL
          AND "__new_auction_events"."player_id" IS NULL
          AND "__new_auction_events"."amount" IS NULL
          AND "__new_auction_events"."credits_before" IS NULL
          AND "__new_auction_events"."credits_after" IS NULL
          AND "__new_auction_events"."contract_year" IS NULL
          AND "__new_auction_events"."actor_name" IS NULL
          AND "__new_auction_events"."actor_role" IS NULL
          AND "__new_auction_events"."comment" IS NULL
          AND "__new_auction_events"."manual_assignment_reason" IS NULL
          AND "__new_auction_events"."suspension_reason" IS NOT NULL
        )
        OR
        (
          "__new_auction_events"."event_type" = 'SESSION_RESUMED'
          AND "__new_auction_events"."auction_call_id" IS NULL
          AND "__new_auction_events"."auction_session_team_id" IS NULL
          AND "__new_auction_events"."player_id" IS NULL
          AND "__new_auction_events"."amount" IS NULL
          AND "__new_auction_events"."credits_before" IS NULL
          AND "__new_auction_events"."credits_after" IS NULL
          AND "__new_auction_events"."contract_year" IS NULL
          AND "__new_auction_events"."actor_name" IS NULL
          AND "__new_auction_events"."actor_role" IS NULL
          AND "__new_auction_events"."comment" IS NULL
          AND "__new_auction_events"."manual_assignment_reason" IS NULL
          AND "__new_auction_events"."suspension_reason" IS NULL
        )
      )),
	CONSTRAINT "auction_events_amount_positive" CHECK("__new_auction_events"."amount" IS NULL OR "__new_auction_events"."amount" > 0),
	CONSTRAINT "auction_events_credits_before_nonnegative" CHECK("__new_auction_events"."credits_before" IS NULL OR "__new_auction_events"."credits_before" >= 0),
	CONSTRAINT "auction_events_credits_after_nonnegative" CHECK("__new_auction_events"."credits_after" IS NULL OR "__new_auction_events"."credits_after" >= 0),
	CONSTRAINT "auction_events_credit_balance" CHECK((
        "__new_auction_events"."amount" IS NULL
        OR "__new_auction_events"."credits_before" IS NULL
        OR "__new_auction_events"."credits_after" IS NULL
        OR "__new_auction_events"."credits_after" = "__new_auction_events"."credits_before" - "__new_auction_events"."amount"
      ))
);
--> statement-breakpoint
INSERT INTO `__new_auction_events`("id", "auction_session_id", "auction_call_id", "event_type", "auction_session_team_id", "player_id", "amount", "credits_before", "credits_after", "contract_year", "actor_name", "actor_role", "comment", "manual_assignment_reason", "suspension_reason", "created_at") SELECT "id", "auction_session_id", "auction_call_id", "event_type", "auction_session_team_id", "player_id", "amount", "credits_before", "credits_after", "contract_year", "actor_name", "actor_role", "comment", NULL, "suspension_reason", "created_at" FROM `auction_events`;--> statement-breakpoint
DROP TABLE `auction_events`;--> statement-breakpoint
ALTER TABLE `__new_auction_events` RENAME TO `auction_events`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `auction_events_call_type_unique` ON `auction_events` (`auction_call_id`,`event_type`);