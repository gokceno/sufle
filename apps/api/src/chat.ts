import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { logger } from "./utils";

const providers = new Map([
  [
    "google",
    (opts: any) => {
      logger.debug("[Chat] Initializing Google Gemini with model:", opts.model);
      // Use default LangChain configuration for tool calling
      return new ChatGoogleGenerativeAI(opts);
    },
  ],
]);

const factory = (provider: string, opts: object) => {
  const chat = providers.get(provider);
  if (!chat) {
    throw new Error(`Unknown chat provider: ${provider}`);
  }
  return chat(opts);
};

export { factory };
