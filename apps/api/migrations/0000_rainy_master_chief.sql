CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text,
	`file_path` text,
	`file_remote` text,
	`file_md5_hash` text,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT null
);
--> statement-breakpoint
CREATE TABLE `embeddings` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`content` text NOT NULL,
	`metadata` text,
	`embedding` F32_BLOB(3072),
	`created_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX idx_embeddings_embedding ON embeddings(libsql_vector_idx(embedding));
