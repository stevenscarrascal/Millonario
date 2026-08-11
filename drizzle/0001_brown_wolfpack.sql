CREATE TABLE `subscribers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`company` text,
	`demo_score` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
