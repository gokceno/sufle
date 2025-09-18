import "dotenv/config";
import fs from "fs";
import YAML from "yaml";
import { z } from "zod";
import { setProperty, hasProperty } from "dot-prop";
import type { KeysToCamelCase } from "./types";

const open = (filename: string): string => {
  if (!filename) {
    throw new Error("File name not specified");
  }
  if (!fs.existsSync(filename)) {
    throw new Error("Config file not found");
  }
  return fs.readFileSync(filename, "utf8");
};

const map = (config: object, startsWith: string = ""): object => {
  if (!process.env) {
    throw new Error("Can not access environment variables.");
  }
  // TODO: Would not replace if source value is not all lower case letters.
  return (
    (Object.entries(process.env)
      .filter(([key, value]) => key.startsWith(startsWith))
      .filter(([key, value]) =>
        hasProperty(config, key.toLowerCase().replaceAll("__", "."))
      )
      .map(([key, value]) =>
        setProperty(config, key.toLowerCase().replaceAll("__", "."), value)
      )
      .pop() as object) || config
  );
};

const raw = <T extends z.ZodType>(filename: string, schema: T): z.infer<T> => {
  const file = open(filename);
  const config: object = YAML.parse(file);
  const mappedConfig: object = map(config);
  const validatedConfig = schema.safeParse(mappedConfig);
  if (!validatedConfig.success) {
    throw new Error(`Invalid config: ${validatedConfig.error}`);
  }
  return validatedConfig.data;
};

const parse = <T extends z.ZodType>(
  filename: string,
  schema: T
): z.infer<T> => {
  const file = open(filename);
  const snakeToCamelCase = (str: string): string =>
    str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());

  const convertKeysToCamelCase = (obj: any): any => {
    if (Array.isArray(obj)) {
      return obj.map((item) => convertKeysToCamelCase(item));
    }
    if (obj && typeof obj === "object") {
      return Object.fromEntries(
        Object.entries(obj).map(([key, value]) => [
          snakeToCamelCase(key),
          convertKeysToCamelCase(value),
        ])
      );
    }
    return obj;
  };

  const config: object = YAML.parse(file);
  const mappedConfig: object = map(config);
  const validatedConfig = schema.safeParse(mappedConfig);
  if (!validatedConfig.success) {
    throw new Error(`Invalid config: ${validatedConfig.error}`);
  }
  return convertKeysToCamelCase(validatedConfig.data);
};

const create = <T extends z.ZodType>(configSchema: T) => {
  return {
    parse: (filename: string): KeysToCamelCase<z.infer<T>> =>
      parse(filename, configSchema),
    raw: (filename: string): z.infer<T> => raw(filename, configSchema),
  };
};

export { create };
