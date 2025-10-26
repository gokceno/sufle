import { create as createConfig } from "@sufle/config";
import type { CamelCaseConfig } from "@sufle/config/types";
import * as z from "zod";

const configSchema = z.object({
  output_models: z.array(
    z.object({
      id: z.string().max(128),
      owned_by: z.string(),
      chat: z.object({
        provider: z.enum(["google"]),
        opts: z.object({
          model: z.string(),
          api_key: z.string(),
          temprature: z.number().max(1).min(0),
          max_messages: z.number().default(32),
          max_tokens: z.number().default(8000),
          max_message_length: z.number().default(4000),
        }),
      }),
    })
  ),
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
    vector_store: z.object({
      provider: z.enum(["libsql"]),
    }),
  }),
  tools: z
    .array(
      z.object({
        tool: z.string(),
        opts: z.record(z.string(), z.any()).optional(),
      })
    )
    .default([]),
  mcp_servers: z
    .array(
      z.object({
        server: z.string(),
        command: z.string(),
        args: z.array(z.string()).optional(),
        env: z.record(z.string(), z.any()).optional(),
      })
    )
    .default([]),
  permissions: z.array(
    z.object({
      users: z.array(z.email()),
      api_keys: z.array(z.string()),
      workspaces: z.array(z.string()), // TODO: Should raise an error if includes ":"
    })
  ),
});

export type RawConfig = z.infer<typeof configSchema>;

export type Config = CamelCaseConfig<RawConfig>;

export const { parse, raw } = createConfig(configSchema);
