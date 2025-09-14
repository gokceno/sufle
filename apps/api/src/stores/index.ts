import * as libsql from "./libsql";

const storeProviders = {
  libsql,
};

const factory = (provider: string) => {
  if (!(provider in storeProviders)) {
    throw new Error(`Invalid vector store provider: ${provider}`);
  }
  return storeProviders[provider];
};

export { factory };
