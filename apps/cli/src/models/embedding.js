export const remove = async ({ documentId }, env) => {
  if (!documentId) throw new Error("Required parameters (documentId) missing.");
  const url = `${env.backend.baseUrl}/documents/${documentId}/embeddings`;
  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      ...(env.backend.apiKey && { "x-api-key": env.backend.apiKey }),
    },
  });
  if (!response.ok)
    throw new Error(
      `Couldn't remove embeddings. HTTP status: ${response.status}`,
    );
};
