import { command, string } from "@drizzle-team/brocli";
import { ToadScheduler, AsyncTask, CronJob } from "toad-scheduler";
import { persist } from "../models/document";
import { factory as storageFactory } from "../storage";
import { parse as config, allowedTypes, logger } from "../utils";

const index = command({
  name: "index",
  options: {
    "config-file": string()
      .desc("Path to config file")
      .default("./sufle.yml")
      .required(),
  },
  handler: async (opts) => {
    const env = config(opts["config-file"]);
    const { list: listFiles, hash: hashFiles } = storageFactory(
      env.storage.provider
    );
    const scheduler = new ToadScheduler();
    const task = new AsyncTask("Index files in given folders", async () => {
      let indexedCount = 0;
      let versionedCount = 0;

      if (!env.workspaces || !Array.isArray(env.workspaces))
        throw new Error("No workspaces defined.");

      await Promise.all(
        env.workspaces.map(async (workspace) => {
          if (!workspace.dirs || !Array.isArray(workspace.dirs))
            throw new Error("No directories defined.");
          await Promise.all(
            workspace.dirs.map(async (dir) => {
              const fileOpts = {
                logger,
                remote: workspace.remote,
                ...(env.storage.opts && env.storage.opts),
              };
              const files = await listFiles(dir, allowedTypes, fileOpts);
              const hashedFiles = await hashFiles(files, fileOpts);

              for (const { file, hash } of hashedFiles) {
                const persistenceResult = await persist(
                  {
                    filePath: file,
                    fileMd5Hash: hash,
                    workspace,
                  },
                  logger,
                  env
                );
                if (persistenceResult) {
                  indexedCount += persistenceResult.createdDocuments;
                  versionedCount += persistenceResult.createdVersions;
                }
              }
            })
          );
        })
      );
      logger.info(`Indexed ${indexedCount} file(s)`);
      logger.info(`Versioned ${versionedCount} file(s)`);
    });
    const job = new CronJob({ cronExpression: env.schedule.index }, task, {
      preventOverrun: true,
    });
    scheduler.addCronJob(job);
    logger.info(`Indexing job started...`);
  },
});

export default index;
