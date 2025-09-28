import {
  RunnableSequence,
  RunnablePassthrough,
} from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { factory as chatFactory } from "../../chat";
import { parse } from "../../utils";
import { factory as storeFactory } from "../../stores";
import type { Config, RetrievedDoc } from "../../types";
import type { ChatMessage } from "../../types/chat";
import { prompt } from "./prompt";

const config: Config = parse(process.env.CONFIG_PATH || "sufle.yml");

const initialize = async (outputModelConfig: object) => {
  const { initialize, filter } = await storeFactory(
    config.rag.vectorStore.provider
  );
  const llm = chatFactory(
    outputModelConfig.chat.provider,
    outputModelConfig.chat.opts
  );
  return { store: initialize(), llm, filter };
};

const perform = async (
  outputModelConfig: object,
  messages: ChatMessage[],
  permissions?: Array<object>
): Promise<string> => {
  const { store, llm, filter } = await initialize(outputModelConfig);
  const retriever = store.asRetriever({
    ...config.rag.retriever.opts,
    ...filter(permissions),
  });

  const chatContext = messages
    .map((msg) => `${msg.role}: ${msg.content}`)
    .join("\n");

  const chain = RunnableSequence.from([
    {
      context: retriever.pipe((docs: Array<RetrievedDoc>) =>
        docs.map((doc: RetrievedDoc) => doc.pageContent).join("\n\n")
      ),
      question: new RunnablePassthrough(),
    },
    prompt,
    llm,
    new StringOutputParser(),
  ]);
  return await chain.invoke(chatContext);
};

const tokens = (messages: ChatMessage[]): number => {
  const totalChars = messages.reduce((sum, msg) => sum + msg.content.length, 0);
  return Math.ceil(totalChars / 4);
};

const limits = (messages: ChatMessage[], outputModelConfig: object) => {
  const { maxMessages, maxTokens, maxMessageLength } =
    outputModelConfig.chat.opts;
  if (messages.length > maxMessages) {
    throw new Error(
      `Conversation is too long. Max number of messages exceed ${maxMessages}`
    );
  }
  for (const message of messages) {
    if (message.content.length > maxMessageLength) {
      throw new Error(`Max message length exceeds ${maxMessageLength}`);
    }
  }
  const totalTokens = tokens(messages);
  if (totalTokens > maxTokens) {
    throw new Error(
      `Conversation is too long. Token count exceeds ${maxTokens}`
    );
  }
  return null;
};

export { perform, tokens, limits };
