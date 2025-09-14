ALTER TABLE `versions` ADD `file_path` text NOT NULL;--> statement-breakpoint
ALTER TABLE `versions` ADD `processed_at` text DEFAULT 'null';