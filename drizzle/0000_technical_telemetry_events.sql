CREATE TABLE `technical_telemetry_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` text NOT NULL,
	`event` text NOT NULL,
	`phase` text NOT NULL,
	`outcome` text NOT NULL,
	`did` text,
	`duration_ms` integer,
	`nrc` integer,
	`device_family` text NOT NULL,
	`error_code` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `technical_telemetry_created_at_idx` ON `technical_telemetry_events` (`created_at`);
--> statement-breakpoint
CREATE INDEX `technical_telemetry_session_idx` ON `technical_telemetry_events` (`session_id`);
