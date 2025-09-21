import fastifyAuth from "@fastify/auth";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type {
  Config,
  ConfigPermission,
  Logger,
  WorkspacePermission,
} from "../types";

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
        const apiKey = request.headers["x-api-key"] as string;
        if (!apiKey) {
          throw new Error("Missing x-api-key header.");
        }
        const permissions = match(config.permissions, apiKey);

        if (!permissions.length) {
          logger.error(`API key ${apiKey} matched no permissions.`);
          throw new Error("No matching permissions.");
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
        const token = extractBearerToken(
          request.headers.authorization as string
        );
        const permissions = match(config.permissions, token);
        if (!permissions.length) {
          logger.error(`API key ${token} matched no permissions.`);
          throw new Error("No matching permissions.");
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
        const owuiUserEmail = request.headers[
          "X-OpenWebUI-User-Email"
        ] as string;
        if (!owuiUserEmail) {
          throw new Error("Missing X-OpenWebUI-User-Email header.");
        }
        const token = extractBearerToken(
          request.headers.authorization as string
        );
        const permissions = match(config.permissions, token, owuiUserEmail);
        if (!permissions.length) {
          logger.error(`API key ${token} matched no permissions.`);
          throw new Error("No matching permissions.");
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

const match = (
  permissions: Array<ConfigPermission>,
  apiKey: string,
  owuiUserEmail: string | undefined = undefined
): Array<WorkspacePermission> => {
  if (!permissions) {
    throw new Error("No permissions defined.");
  }
  return permissions
    .filter((p) => p.apiKeys.includes(apiKey))
    .filter((p) => !owuiUserEmail || p.users.includes(owuiUserEmail))
    .flatMap((p) => {
      return p.workspaces.map((workspace) => {
        const [name, access] = workspace.split(":");
        return {
          workspace: name,
          access: access === "rw" ? ["read", "write"] : ["read"],
        };
      });
    });
};
