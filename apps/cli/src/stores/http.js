const store = ({ embeddings, baseUrl, apiKey, logger }) => ({
  addDocument: async (chunkText, documentId) => {
    if (logger) {
      logger.debug(`Processing document: ${documentId}`);
    }
    const vectors = {
      chunkText,
      embedding: await embeddings.embedQuery(chunkText),
    };
    try {
      const res = await fetch(`${baseUrl}/documents/${documentId}/embeddings`, {
        method: "POST",
        body: JSON.stringify(vectors),
        headers: {
          "Content-Type": "application/json",
          ...(apiKey && { "x-api-key": apiKey }),
        },
      });
      if (!res.ok) throw new Error(`HTTP error. Status: ${res.status}`);
    } catch (error) {
      throw new Error(`Failed to store vectors: ${error.message}`);
    }
    return true;
  },
});

export { store };
