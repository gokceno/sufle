import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

const providers = new Map([
  ["google", (opts: object) => new ChatGoogleGenerativeAI(opts)],
]);

const factory = (provider: string, opts: object) => {
  const chat = providers.get(provider);
  if (!chat) {
    throw new Error(`Unknown chat provider: ${provider}`);
  }
  return chat(opts);
};

export { factory };
