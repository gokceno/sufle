export type { Config, Logger } from "../utils";

export type ConfigPermission = {
  users: string[];
  apiKeys: string[];
  workspaces: string[];
};

export type WorkspacePermission = {
  workspace: string;
  access: Array<"read" | "write">;
};

export type RetrievedDoc = {
  pageContent: string;
};

export type Tool = {
  provider?: Promise<object>;
  name: string;
  description: string;
  responseFormat?: "artifact";
};
