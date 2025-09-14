import fs from "fs";
import YAML from "yaml";
import { z } from "zod";

const yaml = (configFileName) => {
  if (!fs.existsSync(configFileName)) {
    throw new Error("Config file not found");
  }
  const file = fs.readFileSync(configFileName, "utf8");
  const snakeToCamelCase = (str) =>
    str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());

  const convertKeysToCamelCase = (obj) => {
    if (Array.isArray(obj)) {
      return obj.map((item) => convertKeysToCamelCase(item));
    }
    if (obj && typeof obj === "object") {
      return Object.fromEntries(
        Object.entries(obj).map(([key, value]) => [
          snakeToCamelCase(key),
          convertKeysToCamelCase(value),
        ]),
      );
    }
    return obj;
  };

  const config = YAML.parse(file);
  const validatedConfig = configSchema.safeParse(config);
  if (!validatedConfig.success) {
    throw new Error(`Invalid config: ${validatedConfig.error}`);
  }

  return convertKeysToCamelCase(config);
};

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
        openAI_api_key: z.string().optional(),
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
    }),
  ),
});

export { yaml };
