import Fastify from "fastify";
import { parse, logger, setupAuth } from "./utils";
import type { Config } from "./types";
import type { FastifyInstance } from "fastify";
import { documentRoute, chatRoute } from "./routes";

const config: Config = parse(process.env.CONFIG_PATH || "sufle.yml");

const fastify: FastifyInstance = Fastify();

fastify.decorate("logger", logger);
fastify.decorate("config", config);

// Setup authentication
setupAuth(fastify, config, logger);

// Declare a root route
fastify.get("/", async () => {
  return { server: "running" };
});

fastify.register(documentRoute);
fastify.register(chatRoute);

// Run the server
const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: "0.0.0.0" });
    logger.info("Server listening on http://0.0.0.0:3000");
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
};

start();
