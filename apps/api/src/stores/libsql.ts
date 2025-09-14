import { factory as embeddingsFactory } from "@sufle/embeddings";
import { client as libsqlClient } from "../utils/db";
import { LibSQLVectorStore } from "@langchain/community/vectorstores/libsql";
import { embeddings as embeddingsTable } from "../schema";
import { yaml } from "../utils/config";
import type { Config, ConfigPermission } from "../types";

let vectorStore: LibSQLVectorStore | null = null;

const config: Config = yaml(process.env.CONFIG_PATH || "sufle.yml");

const initialize = () => {
  if (vectorStore) return vectorStore;

  const embeddings = embeddingsFactory(
    config.rag.embeddings.provider,
    config.rag.embeddings.opts,
  );

  vectorStore = new LibSQLVectorStore(embeddings, {
    db: libsqlClient,
    table: "embeddings", // TODO: Should be obtained from the schema.
    column: embeddingsTable.embedding.name,
  });

  return vectorStore;
};

const filter = (permissions: Array<ConfigPermission>) => {
  let workspaces: Array<string> = [];
  permissions.map((p) => workspaces.push(...p.workspaces));
  const escapedWorkspaces = workspaces.map((w) => `'${w.replace(/'/g, "''")}'`);
  return {
    filter: `
      document_id IN (
        SELECT id FROM documents
        WHERE workspace_id IN (${escapedWorkspaces.join(", ")})
      )
    `,
  };
};

export { initialize, filter };
