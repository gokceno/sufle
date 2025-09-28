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
          model: z.string(),
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

        if (model !== outputModel.id) {
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
        checkLimits(messages, config);

        const ragResponse = await perform(messages, request.permissions);

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
