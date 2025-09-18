import { command, string } from "@drizzle-team/brocli";
import { ToadScheduler, AsyncTask, CronJob } from "toad-scheduler";
import {
  find as findAllDocuments,
  remove as removeDocument,
} from "../models/document";
import { factory as storageFactory } from "../storage";
import { parse as config, logger } from "../utils";

const reduce = command({
  name: "reduce",
  options: {
    "config-file": string()
      .desc("Path to config file")
      .default("./sufle.yml")
      .required(),
  },
  handler: async (opts) => {
    const env = config(opts["config-file"]);
    const { exists } = storageFactory(env.storage.provider);
    const scheduler = new ToadScheduler();

    const task = new AsyncTask("Reduce files", async () => {
      const documents = await findAllDocuments(
        {
          features: ["markLastCheckedAt", "omitLastChecked"],
        },
        env
      );
      logger.info(`Loaded ${documents.length} documents.`);
      documents.map(async ({ filePath, fileRemote, id }) => {
        try {
          const doesExist = await exists(filePath, {
            logger,
            remote: fileRemote,
            ...(env.storage.opts && env.storage.opts),
          });
          if (!doesExist) {
            await removeDocument({ id }, env);
          }
        } catch (e) {
          logger.error(e.message);
        }
      });
    });
    const job = new CronJob({ cronExpression: env.schedule.reduce }, task, {
      preventOverrun: true,
    });
    scheduler.addCronJob(job);
    logger.info(`Reducing job started...`);
  },
});

export default reduce;
