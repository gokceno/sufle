import { chunkit } from 'semantic-chunking';

const chunk = async (
  text,
  maxTokenSize = 1200,
  onnxEmbeddingModel = 'nomic-ai/nomic-embed-text-v1.5',
) => {
  const chunkitOptions = {
    onnxEmbeddingModel,
    maxTokenSize,
    localModelPath: "./models",
    modelCacheDir: "./models"
  };
  const chunks = await chunkit(
    [{ document_name: 'default', document_text: text }],
    chunkitOptions,
  );
  return chunks;
};

export { chunk };
