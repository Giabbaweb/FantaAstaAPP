CREATE TABLE `command_registry` (
	`id` text PRIMARY KEY NOT NULL,
	`auction_session_id` text NOT NULL,
	`auction_call_id` text NOT NULL,
	`command_id` text NOT NULL,
	`command_type` text NOT NULL,
	`expected_state_version` integer NOT NULL,
	`result_state_version` integer NOT NULL,
	`request_fingerprint` text NOT NULL,
	`result_payload` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`auction_session_id`) REFERENCES `auction_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`auction_call_id`) REFERENCES `auction_calls`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "command_registry_expected_version_nonnegative" CHECK("command_registry"."expected_state_version" >= 0),
	CONSTRAINT "command_registry_result_version_positive" CHECK("command_registry"."result_state_version" >= 1),
	CONSTRAINT "command_registry_version_progression" CHECK("command_registry"."result_state_version" = "command_registry"."expected_state_version" + 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `command_registry_session_command_unique` ON `command_registry` (`auction_session_id`,`command_id`);