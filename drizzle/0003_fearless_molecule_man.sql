ALTER TABLE `participants` ADD `organization_id` text;--> statement-breakpoint
CREATE INDEX `participants_organization_id_idx` ON `participants` (`organization_id`);