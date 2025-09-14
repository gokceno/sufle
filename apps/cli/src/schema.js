import { sqliteTable, text, int } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

export const versions = sqliteTable("versions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  documentRemoteId: text("document_remote_id").notNull(),
  filePath: text("file_path").notNull(),
  fileMd5Hash: text("file_md5_hash").notNull(),
  totalChunks: int("total_chunks").default(0),
  completedChunks: int("completed_chunks").default(0),
  processedAt: text("processed_at", { mode: "datetime" }).default(null),
  createdAt: text("created_at", { mode: "datetime" }).default(
    sql`CURRENT_TIMESTAMP`,
  ),
});
