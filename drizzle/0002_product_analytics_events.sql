CREATE TABLE `product_analytics_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`visit_id` text NOT NULL,
	`event` text NOT NULL,
	`surface` text NOT NULL,
	`locale` text NOT NULL,
	`source` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `product_analytics_created_at_idx` ON `product_analytics_events` (`created_at`);
--> statement-breakpoint
CREATE INDEX `product_analytics_visit_idx` ON `product_analytics_events` (`visit_id`);
--> statement-breakpoint
CREATE INDEX `product_analytics_event_idx` ON `product_analytics_events` (`event`);
--> statement-breakpoint
CREATE INDEX `product_analytics_surface_idx` ON `product_analytics_events` (`surface`);
