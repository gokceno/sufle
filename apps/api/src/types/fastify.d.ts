import type { FastifyRequest, FastifyReply } from "fastify";
import type { Config } from ".";
import type { Logger } from "winston";

declare module "fastify" {
  interface FastifyRequest {
    permissions?: {
      workspaces: Array<string>;
    };
  }

  interface FastifyInstance {
    config: Config;
    logger: Logger;
    verifyApiKey(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    verifyBearerToken(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    verifyOWUI(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  }
}
