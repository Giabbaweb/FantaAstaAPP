PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_command_registry` (
	`id` text PRIMARY KEY NOT NULL,
	`auction_session_id` text NOT NULL,
	`command_scope` text DEFAULT 'AUCTION_CALL' NOT NULL,
	`auction_call_id` text,
	`command_id` text NOT NULL,
	`command_type` text NOT NULL,
	`expected_state_version` integer NOT NULL,
	`result_state_version` integer NOT NULL,
	`request_fingerprint` text NOT NULL,
	`result_payload` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`auction_session_id`) REFERENCES `auction_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`auction_call_id`) REFERENCES `auction_calls`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "command_registry_expected_version_nonnegative" CHECK("__new_command_registry"."expected_state_version" >= 0),
	CONSTRAINT "command_registry_result_version_positive" CHECK("__new_command_registry"."result_state_version" >= 1),
	CONSTRAINT "command_registry_version_progression" CHECK("__new_command_registry"."result_state_version" = "__new_command_registry"."expected_state_version" + 1),
	CONSTRAINT "command_registry_scope_target_consistency" CHECK((
        ("__new_command_registry"."command_scope" = 'AUCTION_CALL' AND "__new_command_registry"."auction_call_id" IS NOT NULL)
        OR
        ("__new_command_registry"."command_scope" = 'AUCTION_SESSION' AND "__new_command_registry"."auction_call_id" IS NULL)
      ))
);
--> statement-breakpoint
INSERT INTO `__new_command_registry`("id", "auction_session_id", "command_scope", "auction_call_id", "command_id", "command_type", "expected_state_version", "result_state_version", "request_fingerprint", "result_payload", "created_at") SELECT "id", "auction_session_id", 'AUCTION_CALL', "auction_call_id", "command_id", "command_type", "expected_state_version", "result_state_version", "request_fingerprint", "result_payload", "created_at" FROM `command_registry`;--> statement-breakpoint
DROP TABLE `command_registry`;--> statement-breakpoint
ALTER TABLE `__new_command_registry` RENAME TO `command_registry`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `command_registry_session_command_unique` ON `command_registry` (`auction_session_id`,`command_id`);