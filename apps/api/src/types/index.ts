export type { Config, Logger } from "../utils";

export type ConfigPermission = {
  users: string[];
  apiKeys: string[];
  workspaces: string[];
};

export type RetrievedDoc = {
  pageContent: string;
};
