import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type {
  ChatCompletionRequestBody,
  ChatCompletionResponse,
} from "../types/chat";
import { createId } from "@paralleldrive/cuid2";
import { factory as rag } from "../rag";
import {
  parse,
  raw,
  missingRequiredFields,
  noModelFound,
  noUserMessage,
  streamingNotSupported,
} from "../utils";
import type { Config, RawConfig } from "../utils";

const config: Config = parse(process.env.CONFIG_PATH || "sufle.yml");
const rawConfig: RawConfig = raw(process.env.CONFIG_PATH || "sufle.yml");

const outputModel = {
  ...rawConfig.output_model,
  supports_streaming: false,
  object: "model" as const,
  created: Math.floor(Date.now() / 1000),
};

export default async function chat(fastify: FastifyInstance) {
  fastify.addHook(
    "preHandler",
    fastify.auth([
      fastify.verifyApiKey,
      fastify.verifyBearerToken,
      fastify.verifyOWUI,
    ])
  );
  fastify.post<{
    Body: ChatCompletionRequestBody;
  }>(
    "/v1/chat/completions",
    async (
      request: FastifyRequest<{ Body: ChatCompletionRequestBody }>,
      reply: FastifyReply
    ) => {
      const { model, messages, stream } = request.body;

      try {
        if (!model || !messages || messages.length === 0) {
          return reply.status(400).send(missingRequiredFields());
        }
        if (model !== outputModel.id) {
          return reply.status(404).send(noModelFound(model));
        }
        if (stream) {
          return reply.status(400).send(streamingNotSupported());
        }
        const userMessages = messages.filter((m) => m.role === "user");
        const lastUserMessage = userMessages[userMessages.length - 1];

        if (!lastUserMessage) {
          return reply.status(400).send(noUserMessage());
        }

        const { perform, tokens } = rag(config.rag.provider);
        const ragResponse = await perform(
          lastUserMessage.content,
          request.permissions
        );

        const response: ChatCompletionResponse = {
          id: `chatcmpl-${createId()}`,
          object: "chat.completion",
          created: Math.floor(Date.now() / 1000),
          model: outputModel.id,
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content: ragResponse,
              },
              finish_reason: "stop",
            },
          ],
          usage: {
            prompt_tokens: tokens(messages),
            completion_tokens: tokens([
              { role: "assistant", content: ragResponse },
            ]),
            total_tokens: 0,
          },
        };

        response.usage.total_tokens =
          response.usage.prompt_tokens + response.usage.completion_tokens;

        return response;
      } catch (error) {
        fastify.logger.error(error, "Error in chat completion");
        return reply.status(500).send({ error: "Internal server error" });
      }
    }
  );

  fastify.get(
    "/v1/models",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        return {
          object: "list",
          data: [outputModel],
        };
      } catch (error) {
        fastify.logger.error(error, "Error fetching models");
        return reply.status(500).send({ error: "Internal server error" });
      }
    }
  );

  fastify.get<{
    Params: { model: string };
  }>(
    "/v1/models/:model",
    async (
      request: FastifyRequest<{ Params: { model: string } }>,
      reply: FastifyReply
    ) => {
      const { model } = request.params;

      try {
        if (model === outputModel.id) {
          return outputModel;
        }

        return reply.status(404).send(noModelFound(model));
      } catch (error) {
        fastify.logger.error(error, "Error fetching model");
        return reply.status(500).send({ error: "Internal server error" });
      }
    }
  );
}
