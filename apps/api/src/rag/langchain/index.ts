import { factory as chatFactory } from "../../chat";
import { parse, raw, logger } from "../../utils";
import { factory as storeFactory } from "../../stores";
import type { Config, RawConfig } from "../../types";
import type { ChatMessage } from "../../types/chat";
import * as availableTools from "../../tools";
import { tool } from "@langchain/core/tools";
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { createAgent } from "langchain";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { create as createPrompt } from "./prompt";

const config: Config = parse(process.env.CONFIG_PATH || "sufle.yml");
const rawConfig: RawConfig = raw(process.env.CONFIG_PATH || "sufle.yml");

const sanitizeSchemaForGemini = (schema: any): any => {
  if (!schema || typeof schema !== "object") {
    return schema;
  }
  const unsupportedKeywords = [
    "exclusiveMinimum",
    "exclusiveMaximum",
    "$schema",
    "$id",
    "$ref",
    "allOf",
    "anyOf",
    "oneOf",
    "not",
    "if",
    "then",
    "else",
    "dependentSchemas",
    "dependentRequired",
    "prefixItems",
    "unevaluatedItems",
    "unevaluatedProperties",
    "contentMediaType",
    "contentEncoding",
    "contentSchema",
  ];

  const sanitized = Array.isArray(schema) ? [] : {};

  for (const [key, value] of Object.entries(schema)) {
    if (unsupportedKeywords.includes(key)) {
      continue;
    }
    if (typeof value === "object" && value !== null) {
      (sanitized as any)[key] = sanitizeSchemaForGemini(value);
    } else {
      (sanitized as any)[key] = value;
    }
  }
  return sanitized;
};

const sanitizeMCPTools = (tools: any[]): any[] => {
  return tools.map((tool) => {
    if (tool.schema) {
      return {
        ...tool,
        schema: sanitizeSchemaForGemini(tool.schema),
      };
    }
    return tool;
  });
};

const initialize = async (
  outputModelConfig: object,
  permissions?: Array<object>
) => {
  const model = chatFactory(
    (outputModelConfig as any).chat.provider,
    (outputModelConfig as any).chat.opts
  );

  const localTools =
    config.tools?.map((configuredTool) => {
      const matchedTool = Object.values(availableTools).find(
        ({ name }) => name === configuredTool.tool
      );
      if (typeof matchedTool?.create !== "function") {
        throw new Error(`Configured tool: ${configuredTool} is not available`);
      }
      const tool = matchedTool.create({
        storeFactory,
        config,
        permissions,
        ...configuredTool.opts,
      });
      return tool;
    }) || [];

  const mcpInstructions: Array<{ name: string; instructions: any }> = [];
  let mcpTools: any[] = [];

  if (rawConfig.mcp_servers && rawConfig.mcp_servers.length > 0) {
    const mcpServers: Record<string, any> = {};

    for (const s of rawConfig.mcp_servers) {
      mcpServers[s.server] = {
        command: s.command,
        args: s.args,
        env: s.env,
      };
      mcpInstructions.push({
        name: s.server,
        instructions: s.instructions,
      });
    }

    if (Object.keys(mcpServers).length > 0) {
      logger.debug("Initializing MCP servers:", Object.keys(mcpServers));
      try {
        const mcpClient = new MultiServerMCPClient(mcpServers);
        const rawMcpTools = await mcpClient.getTools();
        const sanitizedTools = sanitizeMCPTools(rawMcpTools);

        // Wrap MCP tools - they have 'func' property that needs to be exposed as invoke
        mcpTools = sanitizedTools.map((t: any) => {
          return tool(
            async (input: any) => {
              try {
                return await t.func(input);
              } catch (error: any) {
                logger.error(`Error executing tool ${t.name}:`, error.message);
                return `Error executing ${t.name}: ${error.message}`;
              }
            },
            {
              name: t.name,
              description: t.description || `Tool: ${t.name}`,
              schema: t.schema || {},
            }
          );
        });
        logger.debug(`Loaded ${mcpTools.length} MCP tools`);
      } catch (error: any) {
        logger.error("Error initializing MCP client:", error);
        throw error;
      }
    }
  }

  const tools = [...localTools, ...mcpTools];
  const systemPrompt = createPrompt(tools, mcpInstructions);

  return {
    model,
    tools,
    systemPrompt,
  };
};

const perform = async (
  outputModelConfig: object,
  input: ChatMessage[],
  permissions?: Array<object>
): Promise<{ response: string }> => {
  try {
    const { model, tools, systemPrompt } = await initialize(
      outputModelConfig,
      permissions
    );

    logger.debug(`Initializing agent with ${tools.length} tools`);

    const agent = createAgent({
      model,
      tools,
      systemPrompt,
    });

    // Convert all messages to LangChain format for conversation memory
    const messages: any = input
      .map((msg) => {
        const content = String(msg.content || "");
        if (msg.role === "user") {
          return new HumanMessage(content);
        } else if (msg.role === "assistant") {
          return new AIMessage(content);
        }
        return null;
      })
      .filter(Boolean); // Remove null values

    if (messages.length === 0) {
      throw new Error("No user message found in conversation");
    }

    const result = await agent.invoke({
      messages,
    });

    logger.debug(`Agent completed with ${result.messages.length} messages`);

    const lastAIMessage = [...result.messages]
      .reverse()
      .find((m) => m instanceof AIMessage);

    const response = lastAIMessage?.text;

    if (!response || response.trim().length === 0) {
      logger.error("Empty response text");
      return {
        response: "I apologize, but I wasn't able to generate a response.",
      };
    }

    logger.debug(`Response generated: ${response.length} characters`);

    return {
      response,
    };
  } catch (error: any) {
    logger.error("Error during agent execution:", error?.message || error);
    return {
      response: `I encountered an error while processing your request. Please try again.`,
    };
  }
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
