CREATE TABLE `bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`branch` integer NOT NULL,
	`table_no` integer NOT NULL,
	`date` text NOT NULL,
	`hour` integer NOT NULL,
	`duration` integer NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`total` integer NOT NULL,
	`status` text DEFAULT 'confirmed' NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `slots` (
	`id` text PRIMARY KEY NOT NULL,
	`booking` text NOT NULL,
	`branch` integer NOT NULL,
	`table_no` integer NOT NULL,
	`date` text NOT NULL,
	`hour` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `slot_unique` ON `slots` (`branch`,`table_no`,`date`,`hour`);