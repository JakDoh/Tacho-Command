ALTER TABLE `technical_telemetry_events` ADD `attempt_code` text;
--> statement-breakpoint
CREATE INDEX `technical_telemetry_attempt_code_idx` ON `technical_telemetry_events` (`attempt_code`);
