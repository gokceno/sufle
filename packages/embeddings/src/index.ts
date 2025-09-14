import { OpenAIEmbeddings } from "@langchain/openai";
import { OllamaEmbeddings } from "@langchain/ollama";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

type EmbeddingProvider =
  | OpenAIEmbeddings
  | OllamaEmbeddings
  | GoogleGenerativeAIEmbeddings;
type EmbeddingFactory = (opts: any) => EmbeddingProvider;

const providers = new Map<string, EmbeddingFactory>([
  ["openai", (opts: any) => new OpenAIEmbeddings(opts)],
  ["ollama", (opts: any) => new OllamaEmbeddings(opts)],
  ["google", (opts: any) => new GoogleGenerativeAIEmbeddings(opts)],
]);

const factory = (provider: string, opts: any): EmbeddingProvider => {
  const embeddings = providers.get(provider);
  if (!embeddings) {
    throw new Error(`Unknown provider: ${provider}`);
  }
  return embeddings(opts);
};

export { factory };
