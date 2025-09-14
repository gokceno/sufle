import { eq, and } from "drizzle-orm";
import { db, schema } from "../utils";

const has = async ({ documentRemoteId, fileMd5Hash }) => {
  if (!documentRemoteId || !fileMd5Hash)
    throw Error(
      "Required parameters (documentRemoteId, fileMd5Hash) are missing.",
    );
  const version = await db.query.versions.findFirst({
    where: and(
      eq(schema.versions.documentRemoteId, documentRemoteId),
      eq(schema.versions.fileMd5Hash, fileMd5Hash),
    ),
    colums: {
      id: true,
    },
  });
  return !!version?.id;
};

const create = async ({ documentRemoteId, fileMd5Hash, filePath }) => {
  if (!(documentRemoteId && fileMd5Hash && filePath))
    throw new Error(
      "Required parameters (documentRemoteId, fileMd5Hash, filePath) missing.",
    );
  const [version] = await db
    .insert(schema.versions)
    .values({
      fileMd5Hash,
      filePath,
      documentRemoteId,
    })
    .returning({ id: schema.versions.id });
  return { id: version?.id };
};

export { has, create };
