import { z } from "zod";
import { factory as chatFactory } from "../../chat";
import { parse } from "../../utils";
import { factory as storeFactory } from "../../stores";
import type { Config, RetrievedDoc } from "../../types";
import type { ChatMessage } from "../../types/chat";
import { prompt } from "./prompt";
import { createToolCallingAgent, AgentExecutor } from "langchain/agents";
import { tool } from "@langchain/core/tools";

const config: Config = parse(process.env.CONFIG_PATH || "sufle.yml");

const weatherSchema = z.object({
  city: z.string().describe("Name of the city to find the weather for."),
});

const weatherTool = tool(
  (input) => {
    const { city } = input as {
      city: string;
    };
    return `${city} şehrinde hava 38.5 derecedir.`;
  },
  {
    name: "weather",
    description: "Can tell about weather by on city name.",
    schema: weatherSchema,
  }
);

const initialize = async (outputModelConfig: object) => {
  const { initialize, filter } = await storeFactory(
    config.rag.vectorStore.provider
  );
  const baseLlm = chatFactory(
    (outputModelConfig as any).chat.provider,
    (outputModelConfig as any).chat.opts
  );

  const llm = baseLlm.bindTools([weatherTool]);

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

  const docs = await retriever.invoke(chatContext);
  const retrievedContext = docs
    .map((doc: RetrievedDoc) => doc.pageContent)
    .join("\n\n");

  const agent = createToolCallingAgent({
    llm,
    tools: [weatherTool],
    prompt,
  });

  const agentExecutor = new AgentExecutor({
    agent,
    tools: [weatherTool],
  });

  const result = await agentExecutor.invoke({
    input: chatContext,
    context: retrievedContext,
  });

  return typeof result === "string"
    ? result
    : result.output || JSON.stringify(result);
};

const tokens = (messages: ChatMessage[]): number => {
  const totalChars = messages.reduce((sum, msg) => sum + msg.content.length, 0);
  return Math.ceil(totalChars / 4);
};

const limits = (messages: ChatMessage[], outputModelConfig: object) => {
  const { maxMessages, maxTokens, maxMessageLength } = (
    outputModelConfig as any
  ).chat.opts;
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
