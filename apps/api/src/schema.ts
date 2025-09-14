import { sqliteTable, text, int, blob } from "drizzle-orm/sqlite-core";
import { createId } from "@paralleldrive/cuid2";
import { sql, relations } from "drizzle-orm";

export const documents = sqliteTable("documents", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  workspaceId: text("workspace_id"),
  filePath: text("file_path"),
  fileRemote: text("file_remote"),
  fileMd5Hash: text("file_md5_hash"),
  createdAt: int("created_at", { mode: "timestamp" }).default(
    sql`(unixepoch())`,
  ),
  updatedAt: int("updated_at", { mode: "timestamp" }).default(sql`null`),
  lastCheckedAt: int("last_checked_at", { mode: "timestamp" }).default(
    sql`null`,
  ),
});

export const embeddings = sqliteTable("embeddings", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  documentId: text("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  metadata: text("metadata"),
  embedding: blob("embedding"),
  createdAt: int("created_at", { mode: "timestamp" }).default(
    sql`(unixepoch())`,
  ),
});

export const documentsRelations = relations(documents, ({ many }) => ({
  embeddings: many(embeddings),
}));

export const embeddingsRelations = relations(embeddings, ({ one }) => ({
  document: one(documents, {
    fields: [embeddings.documentId],
    references: [documents.id],
  }),
}));
