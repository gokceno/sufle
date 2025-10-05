import { factory as chatFactory } from "../../chat";
import { parse } from "../../utils";
import { factory as storeFactory } from "../../stores";
import type { Config, RetrievedDoc } from "../../types";
import type { ChatMessage } from "../../types/chat";
import { create as createPrompt } from "./prompt";
import * as availableTools from "../../tools";
import { createToolCallingAgent, AgentExecutor } from "langchain/agents";
import { tool } from "@langchain/core/tools";

const config: Config = parse(process.env.CONFIG_PATH || "sufle.yml");

const initialize = async (outputModelConfig: object) => {
  const { initialize, filter } = await storeFactory(
    config.rag.vectorStore.provider
  );
  const baseLlm = chatFactory(
    (outputModelConfig as any).chat.provider,
    (outputModelConfig as any).chat.opts
  );

  const enabledTools = config.tools.map((configuredTool) => {
    const matchedTool = Object.values(availableTools).find(
      ({ name }) => name === configuredTool.tool
    );
    if (typeof matchedTool?.create !== "function") {
      throw new Error(`Configured tool: ${configuredTool} is not available`);
    }
    const { provider, schema, name, description } = matchedTool.create({
      ...configuredTool.opts,
    });
    return {
      tool: tool(provider, {
        schema,
        name,
        description,
        responseFormat: "artifact",
      }),
      name: matchedTool.name,
      description: matchedTool.description,
    };
  });

  const tools = enabledTools.map((t) => t.tool);
  const llm = baseLlm.bindTools([...tools]);

  const prompt = createPrompt(
    enabledTools.map((t) => ({ name: t.name, description: t.description }))
  );

  return { store: initialize(), llm, filter, tools, prompt };
};

const perform = async (
  outputModelConfig: object,
  messages: ChatMessage[],
  permissions?: Array<object>
): Promise<string> => {
  const { store, llm, filter, tools, prompt } = await initialize(
    outputModelConfig
  );
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
    tools,
    prompt,
  });

  const agentExecutor = new AgentExecutor({
    agent,
    tools,
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
