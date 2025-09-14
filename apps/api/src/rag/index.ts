import * as langchain from "./langchain";

const ragProviders = {
  langchain,
};

const factory = (provider: string) => {
  if (!(provider in ragProviders)) {
    throw new Error(`Invalid RAG provider: ${provider}`);
  }
  return ragProviders[provider];
};

export { factory };
