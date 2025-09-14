export interface CreateDocumentBody {
  workspaceId: string;
  fileRemote: string;
  filePath: string;
  fileMd5Hash: string;
}

export interface GetDocumentParams {
  documentId: string;
  fileMd5Hash: string;
}

export interface CreateEmbeddingBody {
  embedding: number[];
  chunkText: string;
}

export interface CreateEmbeddingParams {
  id: string;
}
