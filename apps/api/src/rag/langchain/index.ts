import { factory as chatFactory } from "../../chat";
import { parse, raw, logger } from "../../utils";
import { factory as storeFactory } from "../../stores";
import type { Config, RawConfig, RetrievedDoc } from "../../types";
import type { ChatMessage } from "../../types/chat";
import * as availableTools from "../../tools";
import { tool } from "@langchain/core/tools";
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { createAgent, HumanMessage, AIMessage } from "langchain";
import { createRetrieverTool } from "@langchain/classic/tools/retriever";
import { MemorySaver } from "@langchain/langgraph";
import { create as createPrompt } from "./prompt";
import * as z from "zod";

const config: Config = parse(process.env.CONFIG_PATH || "sufle.yml");
const rawConfig: RawConfig = raw(process.env.CONFIG_PATH || "sufle.yml");

/**
 * Sanitize JSON Schema for Google Gemini API compatibility
 * Removes unsupported keywords like exclusiveMinimum, exclusiveMaximum, etc.
 */
const sanitizeSchemaForGemini = (schema: any): any => {
  if (!schema || typeof schema !== "object") {
    return schema;
  }

  // Keywords not supported by Google Gemini API
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
    // Skip unsupported keywords
    if (unsupportedKeywords.includes(key)) {
      continue;
    }

    // Recursively sanitize nested objects and arrays
    if (typeof value === "object" && value !== null) {
      (sanitized as any)[key] = sanitizeSchemaForGemini(value);
    } else {
      (sanitized as any)[key] = value;
    }
  }

  return sanitized;
};

/**
 * Sanitize MCP tools to be compatible with Google Gemini API
 */
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

const initialize = async (outputModelConfig: object) => {
  const { initialize, filter } = await storeFactory(
    config.rag.vectorStore.provider
  );
  const baseLlm = chatFactory(
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
      const { provider, schema, name, description } = matchedTool.create({
        ...configuredTool.opts,
      });
      return tool(async (input: any) => provider(input), {
        schema,
        name,
        description,
        responseFormat: "artifact",
      });
    }) || [];

  const mcpServers: Record<string, any> = {};
  const mcpInstructions: Array<{ name: string; instructions: any }> = [];
  let mcpTools: any = [];

  if (rawConfig.mcp_servers && rawConfig.mcp_servers.length > 0) {
    for (const s of rawConfig.mcp_servers) {
      mcpServers[s.server] = {
        command: s.command,
        args: s.args,
        env: s.env,
        instructions: s.instructions,
      };
      mcpInstructions.push({
        name: s.server,
        instructions: s.instructions,
      });
    }
    if (Object.keys(mcpServers).length > 0) {
      logger.debug("[MCP] Initializing MCP servers:", Object.keys(mcpServers));
      try {
        const mcpClient = new MultiServerMCPClient(mcpServers);
        const rawMcpTools = await mcpClient.getTools();
        logger.debug("[MCP] Raw tools retrieved:", rawMcpTools.length);
        rawMcpTools.forEach((t: any) => {
          logger.debug(`[MCP] Tool: ${t.name} - ${t.description}`);
          logger.debug(`[MCP] Schema:`, JSON.stringify(t.schema, null, 2));
        });
        // Sanitize MCP tools for Gemini compatibility
        const sanitizedTools = sanitizeMCPTools(rawMcpTools);
        logger.debug("[MCP] Tools after sanitization:", sanitizedTools.length);

        // Explicitly wrap MCP tools as LangChain tools for Gemini compatibility
        mcpTools = sanitizedTools.map((t: any) => {
          logger.debug(`[MCP] Wrapping tool: ${t.name}`);

          // Extract the original function
          const originalInvoke = t.invoke ? t.invoke.bind(t) : t.func?.bind(t);

          if (!originalInvoke) {
            logger.error(`[MCP] Tool ${t.name} has no invoke or func method`);
            throw new Error(`Tool ${t.name} is not properly formed`);
          }

          // Create a new tool using LangChain's tool() wrapper
          return tool(
            async (input: any) => {
              logger.debug(
                `[MCP Tool] Calling ${t.name} with input:`,
                JSON.stringify(input, null, 2)
              );
              try {
                const result = await originalInvoke(input);
                logger.debug(
                  `[MCP Tool] ${t.name} returned:`,
                  typeof result === "string"
                    ? result.substring(0, 200)
                    : JSON.stringify(result, null, 2)
                );
                return result;
              } catch (error: any) {
                logger.error(`[MCP Tool] Error in ${t.name}:`, error);
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
        logger.debug("[MCP] Successfully wrapped all MCP tools");
      } catch (error: any) {
        logger.error("[MCP] Error initializing MCP client:", error);
        throw error;
      }
    }
  }
  const tools = [...localTools, ...mcpTools];
  logger.debug("[Tools] Total tools available:", tools.length);
  logger.debug(
    "[Tools] Tool names:",
    tools.map((t: any) => t.name || "unnamed")
  );

  // Use the comprehensive prompt from prompt.ts
  const promptTemplate = createPrompt(tools, mcpInstructions);

  // Extract the system prompt from the template
  // The prompt template has the system message as the first message
  const firstMessage = promptTemplate.promptMessages[0] as any;
  const systemPrompt =
    firstMessage.prompt?.template || firstMessage.template || "";

  return {
    store: initialize(),
    llm: baseLlm,
    filter,
    tools,
    systemPrompt,
  };
};

const perform = async (
  outputModelConfig: object,
  messages: ChatMessage[],
  permissions?: Array<object>
): Promise<string> => {
  const { store, llm, filter, tools, systemPrompt } = await initialize(
    outputModelConfig
  );

  logger.debug(
    "[Perform] Available tools:",
    tools.map((t: any) => t.name || "unnamed")
  );

  const retriever = store.asRetriever({
    ...config.rag.retriever.opts,
    ...filter(permissions),
  });

  const chatContext = messages
    .map((msg) => `${msg.role}: ${msg.content}`)
    .join("\n");

  logger.debug("[Perform] Chat context:", chatContext);

  // Track retrieved documents for verification
  let retrievedDocuments: any[] = [];
  let retrievalQuery: string = "";

  try {
    // Create a retriever tool for RAG with logging
    const retrieverTool = createRetrieverTool(retriever, {
      name: "retrieve_documents",
      description:
        "Search the knowledge base for relevant information. Use this to find context from uploaded documents. ALWAYS use this tool before answering questions about documentation, policies, or stored information.",
    });

    // Wrap the retriever tool to capture retrieved documents
    const wrappedRetrieverTool = tool(
      async (input: any) => {
        retrievalQuery = input.query || input;
        logger.debug("[RAG] Retrieving documents for query:", retrievalQuery);
        const result = await retrieverTool.invoke(input);

        // Parse the result to extract documents
        try {
          const docs = await retriever.invoke(input.query || input);
          retrievedDocuments = docs;

          logger.debug(`[RAG] Retrieved ${docs.length} documents`);

          docs.forEach((doc: any, idx: number) => {
            logger.debug(`[RAG] Document ${idx + 1}:`, {
              source: doc.metadata?.source || "unknown",
              score: doc.metadata?.score || "N/A",
              preview: doc.pageContent?.substring(0, 100) || "",
              fullContent: doc.pageContent,
              metadata: doc.metadata,
            });
          });
        } catch (err) {
          logger.error("[RAG] Error extracting documents:", err);
        }

        return result;
      },
      {
        name: "retrieve_documents",
        description:
          "Search the knowledge base for relevant information. Use this to find context from uploaded documents. ALWAYS use this tool before answering questions about documentation, policies, or stored information.",
        schema: z.object({
          query: z
            .string()
            .describe("The search query to find relevant documents"),
        }),
      }
    );

    // Combine wrapped retriever tool with other tools
    const allTools = [wrappedRetrieverTool, ...tools];

    logger.debug("[Agent] Total tools including retriever:", allTools.length);

    // Extract model configuration for createAgent
    const modelConfig = (outputModelConfig as any).chat.opts;
    const checkpointer = new MemorySaver();

    // Create agent using LangChain's createAgent
    logger.debug("[Agent] Creating agent with model:", modelConfig.model);

    // Set environment variable for API key if needed
    if (modelConfig.apiKey || modelConfig.api_key) {
      process.env.GOOGLE_API_KEY = modelConfig.apiKey || modelConfig.api_key;
    }

    const agent = createAgent({
      model: `google-genai:${modelConfig.model}`,
      tools: allTools,
      systemPrompt,
      checkpointer,
    });

    // Invoke the agent
    logger.debug("[Agent] Invoking agent");

    // Convert messages to LangChain message objects
    const langchainMessages = messages.map((msg) => {
      if (msg.role === "assistant") {
        return new AIMessage(msg.content);
      }
      // Treat both "user" and "system" as HumanMessage
      return new HumanMessage(msg.content);
    });

    const result = await agent.invoke(
      {
        messages: langchainMessages as any,
      },
      {
        configurable: { thread_id: "default" },
      }
    );

    logger.debug("[Agent] Result received");

    // Extract the final response
    if (result.messages && result.messages.length > 0) {
      const lastMessage = result.messages[result.messages.length - 1];
      const content = lastMessage.content;

      // Log RAG usage verification
      if (retrievedDocuments.length > 0) {
        logger.debug(
          `[RAG Verification] ✓ Response generated using ${retrievedDocuments.length} retrieved documents`
        );
        logger.debug(
          "[RAG Verification] Sources:",
          retrievedDocuments.map((d: any) => d.metadata?.source || "unknown")
        );

        logger.debug("[RAG Verification] Details:");
        logger.debug("  - Query:", retrievalQuery);
        logger.debug("  - Retrieved docs:", retrievedDocuments.length);
        logger.debug(
          "  - Response length:",
          typeof content === "string" ? content.length : "N/A"
        );

        // Check if response contains citations
        const contentStr =
          typeof content === "string" ? content : JSON.stringify(content);
        const hasCitations =
          contentStr.includes("(Source:") ||
          contentStr.includes("According to") ||
          contentStr.includes("Sources Used:");
        logger.debug(
          "  - Contains citations:",
          hasCitations ? "✓ YES" : "✗ NO"
        );

        if (!hasCitations) {
          logger.warn(
            "[RAG Verification] ⚠️  Response does not contain citations despite having retrieved documents!"
          );
        }
      } else {
        logger.warn(
          "[RAG Verification] ⚠️  WARNING: No documents were retrieved for this response"
        );
        logger.debug("[RAG Verification] No retrieval details available");
        logger.debug("  - This response may be from general knowledge");
        logger.debug(
          "  - Consider if retrieve_documents should have been called"
        );
      }

      // Handle different content types
      if (typeof content === "string") {
        return content;
      } else if (Array.isArray(content)) {
        // If content is an array of blocks, extract text
        return content
          .map((block: any) =>
            typeof block === "string" ? block : block.text || ""
          )
          .join("");
      }
      return "No response generated";
    }

    return JSON.stringify(result);
  } catch (error: any) {
    logger.error("[Agent] Error during execution:", error);
    logger.error("[Agent] Error message:", error.message);
    logger.error("[Agent] Error stack:", error.stack);

    // If createAgent fails, it might be a model compatibility issue
    if (error.message?.includes("model")) {
      return `Model configuration error: ${error.message}. Please check your model settings in sufle.yml`;
    }

    return `I encountered an error while processing your request: ${error.message}. Please try again.`;
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
