import * as z from "zod";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type {
  ChatCompletionRequestBody,
  ChatCompletionResponse,
} from "../types/chat";
import { createId } from "@paralleldrive/cuid2";
import { factory as rag } from "../rag";
import {
  parse,
  missingRequiredFields,
  noModelFound,
  streamingNotSupported,
} from "../utils";
import type { Config } from "../utils";

const config: Config = parse(process.env.CONFIG_PATH || "sufle.yml");

const commonModelCapabilities = {
  vision: false,
  function_calling: false,
  tool_calling: false,
  code_interpreter: false,
  retrieval: false,
  image_generation: false,
  audio: false,
  multimodal: false,
};

export default async function chat(fastify: FastifyInstance) {
  fastify.addHook(
    "preHandler",
    fastify.auth([fastify.verifyBearerToken, fastify.verifyOWUI])
  );
  fastify.post<{
    Body: ChatCompletionRequestBody;
  }>(
    "/v1/chat/completions",
    async (
      request: FastifyRequest<{ Body: ChatCompletionRequestBody }>,
      reply: FastifyReply
    ) => {
      try {
        const bodySchema = z.object({
          model: z.string().max(128),
          messages: z.array(
            z.object({
              role: z.string(),
              content: z.string(),
            })
          ),
          stream: z.coerce.boolean(),
        });

        const { model, messages, stream }: z.infer<typeof bodySchema> =
          bodySchema.parse(request.body);

        const outputModelConfig = config.outputModels.find(
          (m) => m.id === model
        );
        if (!outputModelConfig) {
          fastify.logger.error(`No model found with name ${model}`);
          return reply.status(404).send(noModelFound(model));
        }
        if (stream === true) {
          return reply.status(400).send(streamingNotSupported());
        }

        const {
          perform,
          tokens: countTokens,
          limits: checkLimits,
        } = rag(config.rag.provider);

        // Validate against limits, throw an error otherwise.
        checkLimits(messages, outputModelConfig);

        const { response: ragResponse } = await perform(
          outputModelConfig,
          messages,
          request.permissions
        );

        const response: ChatCompletionResponse = {
          id: `chatcmpl-${createId()}`,
          object: "chat.completion",
          created: Math.floor(Date.now() / 1000),
          model,
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
            prompt_tokens: countTokens(messages),
            completion_tokens: countTokens([
              { role: "assistant", content: ragResponse },
            ]),
            total_tokens: 0,
          },
        };

        response.usage.total_tokens =
          response.usage.prompt_tokens + response.usage.completion_tokens;

        return response;
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send(missingRequiredFields());
        } else {
          fastify.logger.error(error.message);
          return reply.status(500).send({ error: error.message });
        }
      }
    }
  );

  fastify.get(
    "/v1/models",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const data = config.outputModels.map((m) => ({
          id: m.id,
          owned_by: m.ownedBy,
          supports_streaming: false,
          object: "model" as const,
          created: Math.floor(Date.now() / 1000),
          capabilities: { ...commonModelCapabilities },
        }));
        return {
          object: "list",
          data,
        };
      } catch (error) {
        fastify.logger.error("Error fetching models");
        fastify.logger.debug(error);
        return reply.status(500).send({ error: "Error fetching models" });
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
      const paramsSchema = z.object({
        model: z.string().max(128),
      });

      const { model } = paramsSchema.parse(request.params);

      try {
        const [data] = config.outputModels
          .filter((m) => m.id === model)
          .map((m) => ({
            id: m.id,
            owned_by: m.ownedBy,
            supports_streaming: false,
            object: "model" as const,
            created: Math.floor(Date.now() / 1000),
            capabilities: { ...commonModelCapabilities },
          }));
        if (!data) {
          return reply.status(404).send(noModelFound(model));
        }
        return { ...data };
      } catch (error) {
        fastify.logger.error(error, "Error fetching model");
        fastify.logger.debug(error);
        return reply.status(500).send({ error: "Error fetching model" });
      }
    }
  );
}
