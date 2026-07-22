CREATE TABLE `auction_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`season` text NOT NULL,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`initial_credits` integer DEFAULT 330 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `owners` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `team_owners` (
	`team_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`is_primary` integer DEFAULT false NOT NULL,
	PRIMARY KEY(`team_id`, `owner_id`),
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_id`) REFERENCES `owners`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `teams` (
	`id` text PRIMARY KEY NOT NULL,
	`auction_session_id` text NOT NULL,
	`name` text NOT NULL,
	`short_name` text,
	`initial_credits` integer DEFAULT 330 NOT NULL,
	`renewal_credits` integer DEFAULT 0 NOT NULL,
	`remaining_credits` integer DEFAULT 330 NOT NULL,
	`table_order` integer NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`auction_session_id`) REFERENCES `auction_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
