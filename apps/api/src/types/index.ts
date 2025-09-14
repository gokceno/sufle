export type Config = {
  outputModel: {
    id: string;
    ownedBy: string;
  };
  rag: {
    provider: string | "langchain";
    embeddings: {
      provider: string | "google";
      opts: {
        model: string;
        apiKey: string;
      };
    };
    retriever: {
      opts: object;
    };
    chat: {
      provider: string | "google";
      opts: {
        model: string;
        apiKey: string;
        temprature: number;
      };
    };
    vectorStore: {
      provider: string | "libsql";
    };
  };
  permissions: ConfigPermission[];
};

export type ConfigPermission = {
  users: string[];
  apiKeys: string[];
  workspaces: string[];
};

export type RawConfig = {
  output_model: {
    id: string;
    owned_by: string;
  };
};

export type RetrievedDoc = {
  pageContent: string;
};
