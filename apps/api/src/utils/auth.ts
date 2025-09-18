import fastifyAuth from "@fastify/auth";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { Config, ConfigPermission, Logger } from "../types";

export function setupAuth(
  fastify: FastifyInstance,
  config: Config,
  logger: Logger
): void {
  fastify.register(fastifyAuth);

  fastify.decorate(
    "verifyApiKey",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        if (!config.permissions) {
          throw new Error("No permissions defined.");
        }

        const apiKey = request.headers["x-api-key"] as string;
        if (!apiKey) {
          throw new Error("Missing x-api-key header.");
        }

        const permissions = config.permissions
          .filter((p: ConfigPermission) => p.apiKeys.includes(apiKey))
          .map((p: ConfigPermission) => {
            return { workspaces: p.workspaces };
          });
        if (!permissions) {
          throw new Error("No matching permissions found.");
        }
        logger.debug(`API key ${apiKey} gained access.`, permissions);
        (request as any).permissions = permissions;
      } catch (err) {
        throw new Error("API key authentication failed.");
      }
    }
  );

  fastify.decorate(
    "verifyBearerToken",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        if (!config.permissions) {
          throw new Error("No permissions defined.");
        }
        const token = extractBearerToken(
          request.headers.authorization as string
        );
        const permissions = config.permissions
          .filter((p: ConfigPermission) => p.apiKeys.includes(token))
          .map((p: ConfigPermission) => {
            return { workspaces: p.workspaces };
          });

        if (!permissions.length) {
          throw new Error("No matching permissions found.");
        }
        logger.debug(`Bearer token key ${token} gained access.`, permissions);
        (request as any).permissions = permissions;
      } catch (err) {
        throw new Error("Bearer token authentication failed.");
      }
    }
  );

  fastify.decorate(
    "verifyOWUI",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        if (!config.permissions) {
          throw new Error("No permissions defined.");
        }
        const owuiUserEmail = request.headers[
          "X-OpenWebUI-User-Email"
        ] as string;
        if (!owuiUserEmail) {
          throw new Error("Missing X-OpenWebUI-User-Email header.");
        }
        const token = extractBearerToken(
          request.headers.authorization as string
        );
        const permissions = config.permissions
          .filter((p: ConfigPermission) => p.apiKeys.includes(token))
          .filter((p: ConfigPermission) => p.users.includes(owuiUserEmail))
          .map((p: ConfigPermission) => {
            return { workspaces: p.workspaces };
          });

        if (!permissions.length) {
          throw new Error("No matching permissions found.");
        }
        logger.debug(
          `API key ${token} and OWUI email ${owuiUserEmail} gained access.`,
          permissions
        );
        (request as any).permissions = permissions;
      } catch (err) {
        throw new Error("OpenWebUI authentication failed.");
      }
    }
  );
}

const extractBearerToken = (header: string): string => {
  if (!header) {
    throw new Error("Missing Authorization header");
  }

  if (!header.startsWith("Bearer ")) {
    throw new Error("Invalid Authorization header format.");
  }

  const token = header.slice(7);
  if (!token) {
    throw new Error("Missing bearer token.");
  }
  return token;
};
