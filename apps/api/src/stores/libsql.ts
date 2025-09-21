import { factory as embeddingsFactory } from "@sufle/embeddings";
import { client as libsqlClient } from "../utils/db";
import { LibSQLVectorStore } from "@langchain/community/vectorstores/libsql";
import { embeddings as embeddingsTable } from "../schema";
import { parse } from "../utils/config";
import type { Config, WorkspacePermission } from "../types";

let vectorStore: LibSQLVectorStore | null = null;

const config: Config = parse(process.env.CONFIG_PATH || "sufle.yml");

const initialize = () => {
  if (vectorStore) return vectorStore;

  const embeddings = embeddingsFactory(
    config.rag.embeddings.provider,
    config.rag.embeddings.opts
  );

  vectorStore = new LibSQLVectorStore(embeddings, {
    db: libsqlClient,
    table: "embeddings", // TODO: Should be obtained from the schema.
    column: embeddingsTable.embedding.name,
  });

  return vectorStore;
};

const filter = (permissions: Array<WorkspacePermission>) => {
  const workspaces: Array<string> = permissions
    .filter((p) => p.access.includes("read"))
    .map((p) => p.workspace)
    .map((w) => `'${w.replace(/'/g, "''")}'`);
  return {
    filter: `
      document_id IN (
        SELECT id FROM documents
        WHERE workspace_id IN (${workspaces.join(", ")})
      )
    `,
  };
};

export { initialize, filter };
