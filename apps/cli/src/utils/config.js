import { create as createConfig } from "@sufle/config";
import * as z from "zod";

const configSchema = z.object({
  backend: z.object({
    api_key: z.string(),
    base_url: z.string().url(),
  }),
  schedule: z.object({
    index: z.string(),
    reduce: z.string(),
    vectorize: z.string(),
  }),
  embeddings: z.object({
    provider: z.enum(["ollama", "openai", "google"]),
    opts: z
      .object({
        model: z.string().optional(),
        base_url: z.string().url().optional(),
        api_key: z.string().optional(),
      })
      .optional(),
  }),
  storage: z.object({
    provider: z.enum(["local", "rclone"]),
    opts: z
      .object({
        url: z.string().url(),
        username: z.string(),
        password: z.string(),
      })
      .optional(),
  }),
  workspaces: z.array(
    z.object({
      id: z.string(),
      remote: z.string().optional(),
      dirs: z.array(z.string()),
    })
  ),
});

export const { parse, raw } = createConfig(configSchema);
