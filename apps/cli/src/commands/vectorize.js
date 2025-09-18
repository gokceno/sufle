import { command, string } from "@drizzle-team/brocli";
import { factory as embeddingsFactory } from "@sufle/embeddings";
import { ToadScheduler, AsyncTask, CronJob } from "toad-scheduler";
import {
  process as processDocument,
  find as findDocuments,
} from "../models/document";
import { remove as removeEmbeddingsFromDocument } from "../models/embedding";
import { factory as storageFactory } from "../storage";
import {
  parse as config,
  chunk,
  convert as toMarkdown,
  logger,
} from "../utils";
import { store } from "../stores/http";

const vectorize = command({
  name: "vectorize",
  options: {
    "config-file": string()
      .desc("Path to config file")
      .default("./sufle.yml")
      .required(),
  },
  handler: async (opts) => {
    const env = config(opts["config-file"]);

    const { open: openFile } = storageFactory(env.storage.provider);

    const embeddings = embeddingsFactory(
      env.embeddings.provider,
      env.embeddings.opts
    );

    const vectorStore = store({
      baseUrl: env.backend.baseUrl,
      apiKey: env.backend.apiKey,
      embeddings,
      logger,
    });

    const scheduler = new ToadScheduler();

    const task = new AsyncTask("Vectorize files", async () => {
      const CONCURRENT_LIMIT = 8;
      const documents = await findDocuments(
        { features: ["omitLastUpdated", "includeLatestVersion"] },
        env
      );
      logger.info(`Loaded ${documents.length} document(s)`);
      documents
        .filter(
          (d) =>
            d.latestVersion?.fileMd5Hash &&
            d.fileMd5Hash !== d.latestVersion.fileMd5Hash
        )
        .map(async ({ id, filePath, fileRemote, latestVersion }) => {
          logger.info(`Loaded file: ${filePath}`);
          try {
            const { fileMd5Hash: latestVersionFileMd5Hash } = latestVersion;
            let { completedChunks } = latestVersion;
            logger.debug(`Completed chunks: ${completedChunks}`);
            await removeEmbeddingsFromDocument({ documentId: id }, env);
            const fileContents = await openFile(
              filePath,
              latestVersionFileMd5Hash,
              {
                logger,
                remote: fileRemote,
                ...(env.storage.opts && env.storage.opts),
              }
            );
            if (!fileContents) {
              logger.warn(`File at ${filePath} is empty or cannot be opened.`);
            }
            const textContents = toMarkdown(fileContents, { logger });
            if (!textContents) {
              logger.warn(
                `File at ${filePath} cannot be converted to plain text or is empty.`
              );
            }
            const chunks = await chunk(textContents);
            if (chunks.length) {
              logger.info(
                `Started processing total of ${chunks.length} chunks.`
              );
              while (completedChunks < chunks.length) {
                logger.info(
                  `Started processing from ${completedChunks}. chunk.`
                );
                const batch = chunks.slice(
                  completedChunks,
                  completedChunks + CONCURRENT_LIMIT
                );
                await Promise.all(
                  batch.map(
                    async ({ text }) => await vectorStore.addDocument(text, id)
                  )
                );
                completedChunks += batch.length;
                await processDocument(
                  {
                    id,
                    fileMd5Hash: latestVersionFileMd5Hash,
                    totalChunks: chunks.length,
                    completedChunks,
                  },
                  logger,
                  env
                );
                logger.info(
                  `Processed ${batch.length} chunks, completed a total of ${completedChunks} chunks.`
                );
              }
            } else {
              logger.warn(`No chunks found in: ${filePath}`);
            }
          } catch (e) {
            logger.error(e.message);
          }
        });
    });
    const job = new CronJob({ cronExpression: env.schedule.vectorize }, task, {
      preventOverrun: true,
    });
    scheduler.addCronJob(job);
    logger.info(`Vectorizing job started...`);
  },
});

export default vectorize;
