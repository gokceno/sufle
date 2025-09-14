import type { FastifyInstance, FastifyRequest } from "fastify";
import { eq, and, sql, or, isNull, lt } from "drizzle-orm";
import { db } from "../utils";
import { documents, embeddings } from "../schema";
import type {
  CreateDocumentBody,
  GetDocumentParams,
  CreateEmbeddingBody,
  CreateEmbeddingParams,
} from "../types/document";

export default async function document(fastify: FastifyInstance) {
  fastify.addHook(
    "preHandler",
    fastify.auth([fastify.verifyApiKey, fastify.verifyBearerToken]),
  );

  // Get document
  fastify.get<{
    Params: GetDocumentParams;
  }>("/document", async (request, reply) => {
    const id = request.headers["x-id"] as string | undefined;
    const filePath = request.headers["x-file-path"] as string | undefined;
    const fileMd5Hash = request.headers["x-file-hash"] as string | undefined;
    const workspaceId = request.headers["x-workspace-id"] as string | undefined;

    try {
      const document = await db.query.documents.findFirst({
        where: and(
          ...[
            id !== undefined ? eq(documents.id, id) : [],
            fileMd5Hash !== undefined
              ? eq(documents.fileMd5Hash, fileMd5Hash)
              : [],
            filePath !== undefined
              ? eq(documents.filePath, decodeURIComponent(filePath))
              : [],
            workspaceId !== undefined
              ? eq(documents.workspaceId, decodeURIComponent(workspaceId))
              : [],
          ].flat(),
        ),
        columns: {
          id: true,
        },
      });

      if (!document) {
        return reply.status(404).send({ error: "Document not found" });
      }

      return document;
    } catch (error) {
      fastify.logger.error(error, "Error fetching document");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  // Create new document
  fastify.post<{
    Body: CreateDocumentBody;
  }>("/documents", async (request, reply) => {
    const { workspaceId, fileRemote, filePath } = request.body;

    // Validation
    if (!workspaceId || !fileRemote || !filePath) {
      return reply.status(400).send({
        error: "workspaceId, fileRemote and filePath are required",
      });
    }

    try {
      // Check if document already exists
      const existingDocument = await db.query.documents.findFirst({
        where: eq(documents.filePath, filePath),
        columns: { id: true },
      });

      if (existingDocument) {
        return reply.status(409).send({
          error: "Document with this path hash already exists",
          id: existingDocument.id,
        });
      }

      // Create new document
      const [newDocument] = await db
        .insert(documents)
        .values({
          workspaceId,
          fileRemote,
          filePath,
        })
        .returning({
          id: documents.id,
          workspaceId: documents.workspaceId,
          filePath: documents.filePath,
          fileRemote: documents.fileRemote,
          createdAt: documents.createdAt,
        });

      return reply.status(201).send(newDocument);
    } catch (error) {
      fastify.logger.error(error, "Error creating document");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  // Update document by MD5 hash
  fastify.put<{
    Params: GetDocumentParams;
    Body: { fileMd5Hash?: string };
  }>("/documents/:documentId", async (request, reply) => {
    const { documentId } = request.params;
    const { fileMd5Hash } = request.body;

    if (!documentId) {
      return reply.status(400).send({ error: "documentId is required" });
    }

    if (!fileMd5Hash) {
      return reply
        .status(400)
        .send({ error: "fileMd5Hash is required in body" });
    }

    try {
      // Check if document exists
      const existingDocument = await db.query.documents.findFirst({
        where: eq(documents.id, documentId),
        columns: { id: true },
      });

      if (!existingDocument) {
        return reply.status(404).send({ error: "Document not found" });
      }

      // Update the document
      const [updatedDocument] = await db
        .update(documents)
        .set({ fileMd5Hash })
        .where(eq(documents.id, documentId))
        .returning({
          id: documents.id,
          fileMd5Hash: documents.fileMd5Hash,
        });

      return updatedDocument;
    } catch (error) {
      fastify.logger.error(error, "Error updating document");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  // Get all documents (with optional filtering)
  fastify.get("/documents", async (request: FastifyRequest, reply) => {
    try {
      const isMarkLastCheckedAt =
        request.headers["x-mark-last-checked-at"] === "true";
      const omitLastChecked = request.headers["x-omit-last-checked"] === "true";
      const omitLastUpdated = request.headers["x-omit-last-updated"] === "true";

      const result = await db.query.documents.findMany({
        where: and(
          ...[
            omitLastChecked === true
              ? or(
                  isNull(documents.lastCheckedAt),
                  lt(
                    documents.lastCheckedAt,
                    sql`strftime('%s', 'now', '-1 minute')`,
                  ),
                )
              : undefined,
            omitLastUpdated === true
              ? or(
                  isNull(documents.updatedAt),
                  lt(
                    documents.updatedAt,
                    sql`strftime('%s', 'now', '-1 minute')`,
                  ),
                )
              : undefined,
          ],
        ),
        orderBy: (documents, { asc }) => [
          asc(documents.updatedAt),
          asc(documents.lastCheckedAt),
        ],
        limit: 25,
      });
      fastify.logger.info(`Loaded ${result.length} records.`);
      if (isMarkLastCheckedAt === true) {
        if (result.length > 0) {
          await db
            .update(documents)
            .set({
              lastCheckedAt: sql`unixepoch()`,
            })
            .where(or(...result.map((row) => eq(documents.id, row.id))));
        }
      }
      return result;
    } catch (error) {
      fastify.logger.error(error, "Error fetching documents");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  // Delete document by ID
  fastify.delete<{
    Params: GetDocumentParams;
  }>("/documents/:id", async (request, reply) => {
    const { id } = request.params;

    if (!id) {
      return reply.status(400).send({ error: "Document id is required" });
    }

    try {
      const [deletedDocument] = await db
        .delete(documents)
        .where(eq(documents.id, id))
        .returning({ id: documents.id });

      if (!deletedDocument) {
        return reply.status(404).send({ error: "Document not found" });
      }

      return reply.status(204).send();
    } catch (error) {
      fastify.logger.error(error, "Error deleting document");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  // Store embeddings for a document
  fastify.post<{
    Params: CreateEmbeddingParams;
    Body: CreateEmbeddingBody;
  }>("/documents/:id/embeddings", async (request, reply) => {
    const { id } = request.params;
    const { embedding, chunkText } = request.body;

    if (!id) {
      return reply.status(400).send({ error: "Document ID is required" });
    }

    if (
      !embedding ||
      !Array.isArray(embedding) ||
      !chunkText ||
      typeof chunkText !== "string"
    ) {
      return reply.status(400).send({
        error:
          "Missing parameters: embedding (array) and chunkText (string) are required",
      });
    }

    try {
      // Check if document exists
      const document = await db.query.documents.findFirst({
        where: eq(documents.id, id),
        columns: { id: true },
      });

      if (!document) {
        return reply.status(404).send({ error: "Document not found" });
      }

      // Store the embedding
      const [newEmbedding] = await db
        .insert(embeddings)
        .values({
          documentId: id,
          embedding: Buffer.from(new Float32Array(embedding).buffer),
          content: chunkText,
        })
        .returning({
          id: embeddings.id,
          documentId: embeddings.documentId,
          content: embeddings.content,
          createdAt: embeddings.createdAt,
        });

      // Update the parent documents updatedAt.
      await db
        .update(documents)
        .set({
          updatedAt: sql`(unixepoch())`,
        })
        .where(eq(documents.id, id));

      return reply.status(201).send(newEmbedding);
    } catch (error) {
      fastify.logger.debug(error);
      fastify.logger.error("Error storing embeddings");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  // Delete all embeddings for a document
  fastify.delete<{
    Params: CreateEmbeddingParams;
  }>("/documents/:id/embeddings", async (request, reply) => {
    const { id } = request.params;
    if (!id) {
      return reply.status(400).send({ error: "Document ID is required" });
    }

    try {
      // Check if document exists
      const document = await db.query.documents.findFirst({
        where: eq(documents.id, id),
        columns: { id: true },
      });

      if (!document) {
        return reply.status(404).send({ error: "Document not found" });
      }

      // Delete all embeddings for this document
      const deletedEmbeddings = await db
        .delete(embeddings)
        .where(eq(embeddings.documentId, id))
        .returning({ id: embeddings.id });

      return reply.status(200).send({
        message: `Deleted ${deletedEmbeddings.length} embeddings`,
        deletedCount: deletedEmbeddings.length,
      });
    } catch (error) {
      fastify.logger.error(error, "Error deleting embeddings");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });
}
