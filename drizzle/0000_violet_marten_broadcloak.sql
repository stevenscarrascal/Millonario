CREATE TABLE `participants` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text NOT NULL,
	`consent` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL
);
