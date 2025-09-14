import fs from "fs";
import YAML from "yaml";
import { z } from "zod";
import type { RawConfig, Config } from "../types";

const raw = (configFileName: string): RawConfig => {
  if (!fs.existsSync(configFileName)) {
    throw new Error("Config file not found");
  }
  const file = fs.readFileSync(configFileName, "utf8");
  const config: object = YAML.parse(file);
  const validatedConfig: any = configSchema.safeParse(config);
  if (!validatedConfig.success) {
    throw new Error(`Invalid config: ${validatedConfig.error}`);
  }
  return config as RawConfig;
};

const yaml = (configFileName: string): Config => {
  if (!fs.existsSync(configFileName)) {
    throw new Error("Config file not found");
  }
  const file = fs.readFileSync(configFileName, "utf8");
  const snakeToCamelCase = (str: string): string =>
    str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());

  const convertKeysToCamelCase = (obj: object): object => {
    if (Array.isArray(obj)) {
      return obj.map((item) => convertKeysToCamelCase(item));
    }
    if (obj && typeof obj === "object") {
      return Object.fromEntries(
        Object.entries(obj as object).map(([key, value]) => [
          snakeToCamelCase(key),
          convertKeysToCamelCase(value),
        ]),
      );
    }
    return obj;
  };
  const config: object = YAML.parse(file);
  const validatedConfig: any = configSchema.safeParse(config);
  if (!validatedConfig.success) {
    throw new Error(`Invalid config: ${validatedConfig.error}`);
  }
  return convertKeysToCamelCase(config) as Config;
};

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
    }),
  ),
});

export { yaml, raw };
