CREATE TABLE `fms_export_goalkeepers` (
	`id` text PRIMARY KEY NOT NULL,
	`auction_session_team_id` text NOT NULL,
	`player_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`auction_session_team_id`) REFERENCES `auction_session_teams`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fms_export_goalkeepers_session_team_unique` ON `fms_export_goalkeepers` (`auction_session_team_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `fms_export_goalkeepers_player_unique` ON `fms_export_goalkeepers` (`player_id`);