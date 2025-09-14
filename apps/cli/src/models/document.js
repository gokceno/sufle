import { eq, sql, desc, and } from "drizzle-orm";
import { db, schema } from "../utils";
import { has as hasVersion, create as createVersion } from "./version";

const persist = async ({ filePath, fileMd5Hash, workspace }, logger, env) => {
  if (!(filePath && fileMd5Hash && workspace))
    throw new Error(
      "Required parameters (filePath, fileMd5Hash, workspace) missing.",
    );

  let createdDocuments = 0;
  let createdVersions = 0;

  const { id: existingDocumentRemoteId } = await get(
    { filePath, workspace },
    env,
  );
  let documentRemoteId = existingDocumentRemoteId;

  if (!existingDocumentRemoteId) {
    const { id: createdDocumentId } = await create(
      {
        filePath,
        workspace,
      },
      env,
    );
    if (createdDocumentId) {
      documentRemoteId = createdDocumentId;
      createdDocuments++;
      if (logger) logger.debug(`Created document for file: ${filePath}`);
    }
  }

  const isVersionPresent = await hasVersion({
    documentRemoteId,
    fileMd5Hash,
  });

  if (!isVersionPresent) {
    const { id: createdVersionId } = await createVersion({
      documentRemoteId,
      fileMd5Hash,
      filePath,
    });
    if (createdVersionId) {
      createdVersions++;
      if (logger)
        logger.debug(`Created version for remote id ${documentRemoteId}`);
    }
  }
  return { createdDocuments, createdVersions };
};

const process = async (
  { id, fileMd5Hash, totalChunks, completedChunks },
  logger,
  env,
) => {
  if (!id || !fileMd5Hash)
    throw new Error("Required parameters (id, fileMd5Hash) missing.");
  if (totalChunks === completedChunks) {
    const url = `${env.backend.baseUrl}/documents/${id}`;
    const response = await fetch(url, {
      method: "PUT",
      body: JSON.stringify({
        fileMd5Hash,
      }),
      headers: {
        "Content-Type": "application/json",
        ...(env.backend.apiKey && { "x-api-key": env.backend.apiKey }),
      },
    });
    if (!response.ok)
      throw new Error(
        `Couldn't update the document. HTTP status: ${response.status}`,
      );
    if (logger) logger.debug(`Updated document: ${id}`);
  }
  const [updated] = await db
    .update(schema.versions)
    .set({
      processedAt:
        totalChunks === completedChunks ? sql`CURRENT_TIMESTAMP` : undefined,
      totalChunks,
      completedChunks,
    })
    .where(
      and(
        eq(schema.versions.fileMd5Hash, fileMd5Hash),
        eq(schema.versions.documentRemoteId, id),
      ),
    )
    .returning({ id: schema.versions.id });
  return !!updated;
};

const get = async ({ fileMd5Hash, filePath, id, workspace }, env) => {
  if (!(filePath && workspace))
    throw new Error("Required parameters (filePath, workspace) missing.");
  const url = `${env.backend.baseUrl}/document`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(env.backend.apiKey && { "x-api-key": env.backend.apiKey }),
      ...(filePath && { "x-file-path": encodeURIComponent(filePath) }),
      ...(workspace && { "x-workspace-id": encodeURIComponent(workspace.id) }),
      ...(fileMd5Hash && { "x-file-hash": fileMd5Hash }),
      ...(id && { "x-id": id }),
    },
  });
  if (!response.ok) return { id: null };

  const document = await response.json();
  return { id: document.id };
};

const find = async ({ features = [] }, env) => {
  const url = `${env.backend.baseUrl}/documents`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(features.includes("markLastCheckedAt") && {
        "x-mark-last-checked-at": true,
      }),
      ...(features.includes("omitLastChecked") && {
        "x-omit-last-checked": true,
      }),
      ...(features.includes("omitLastUpdated") && {
        "x-omit-last-updated": true,
      }),
      ...(env.backend.apiKey && { "x-api-key": env.backend.apiKey }),
    },
  });

  if (!response.ok) {
    throw new Error(
      `Couldn't fetch documents. HTTP status: ${response.status}`,
    );
  }

  const documents = await response.json();

  if (!features.includes("includeLatestVersion")) return documents;

  // For each document, find the latest version and embed it
  const documentsWithLatestVersion = await Promise.all(
    documents.map(async (document) => {
      const latestVersion = await db.query.versions.findFirst({
        where: eq(schema.versions.documentRemoteId, document.id),
        orderBy: desc(schema.versions.createdAt),
      });

      return {
        ...document,
        latestVersion,
      };
    }),
  );
  return documentsWithLatestVersion;
};

const create = async ({ filePath, workspace }, env) => {
  if (!(filePath && workspace))
    throw new Error("Required parameters (filePath, workspace) missing.");
  const url = `${env.backend.baseUrl}/documents`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(env.backend.apiKey && { "x-api-key": env.backend.apiKey }),
    },
    body: JSON.stringify({
      workspaceId: workspace.id,
      fileRemote: workspace.remote,
      filePath,
    }),
  });
  if (!response.ok)
    throw new Error(
      `Couldn't create remote documents. HTTP status: ${response.status}`,
    );
  const document = await response.json();
  return { id: document.id };
};

const remove = async ({ id }, env) => {
  if (!id) throw new Error("Required parameters (id) missing.");
  const url = `${env.backend.baseUrl}/documents/${id}`;
  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      ...(env.backend.apiKey && { "x-api-key": env.backend.apiKey }),
    },
  });
  if (!response.ok)
    throw new Error(
      `Couldn't remove document: ${id}. HTTP status: ${response.status}`,
    );
  await db
    .delete(schema.versions)
    .where(eq(schema.versions.documentRemoteId, id));
};

export { persist, find, process, remove };
