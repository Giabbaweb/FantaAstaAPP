CREATE TABLE `fms_session_exports` (
	`auction_session_id` text PRIMARY KEY NOT NULL,
	`exported_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`auction_session_id`) REFERENCES `auction_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
