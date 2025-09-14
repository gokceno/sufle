CREATE TABLE `versions` (
	`id` text PRIMARY KEY NOT NULL,
	`document_remote_id` text NOT NULL,
	`file_md5_hash` text NOT NULL,
	`total_chunks` integer DEFAULT 0,
	`completed_chunks` integer DEFAULT 0,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `versions_file_md5_hash_unique` ON `versions` (`file_md5_hash`);