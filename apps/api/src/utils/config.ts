import { create as createConfig } from "@sufle/config";
import type { CamelCaseConfig } from "@sufle/config/types";
import { z } from "zod";

const configSchema = z.object({
  output_model: z.object({
    id: z.string(),
    owned_by: z.string(),
  }),
  rag: z.object({
    provider: z.enum(["langchain"]),
    embeddings: z.object({
      provider: z.enum(["google"]),
      opts: z.object({
        model: z.string(),
        api_key: z.string(),
      }),
    }),
    retriever: z.object({
      opts: z.object({
        k: z.number(),
      }),
    }),
    chat: z.object({
      provider: z.enum(["google"]),
      opts: z.object({
        model: z.string(),
        api_key: z.string(),
        temprature: z.number().max(1).min(0),
      }),
    }),
    vector_store: z.object({
      provider: z.enum(["libsql"]),
    }),
  }),
  permissions: z.array(
    z.object({
      users: z.array(z.string()),
      api_keys: z.array(z.string()),
      workspaces: z.array(z.string()),
    })
  ),
});

export type RawConfig = z.infer<typeof configSchema>;

export type Config = CamelCaseConfig<RawConfig>;

export const { parse, raw } = createConfig(configSchema);
