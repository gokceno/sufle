import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { getInstructions } from "./prompt";

const name: string = "rag";
const description: string = `Search the knowledge base for relevant information. Use this to find context from uploaded documents. ALWAYS use this tool before answering questions about documentation, policies, or stored information.`;
const instructions = getInstructions();

const create = (opts: Opts) => {
  const { storeFactory, config, permissions } = opts;

  if (!storeFactory || !config) {
    throw new Error(
      "RAG tool requires storeFactory and config to be provided in opts"
    );
  }

  const schema = z.object({
    query: z.string().describe("The search query to find relevant documents"),
  });

  const provider = async (input: any) => {
    const { query } = schema.parse(input);

    const { initialize, filter } = await storeFactory(
      config.rag.vectorStore.provider
    );
    const store = initialize();
    const retriever = store.asRetriever({
      ...config.rag.retriever.opts,
      ...filter(permissions),
    });

    const docs = await retriever.invoke(query);
    return docs.map((doc: any) => doc.pageContent).join("\n\n");
  };

  return tool(provider, {
    name,
    description,
    schema,
    responseFormat: "artifact",
  });
};

type Opts = {
  storeFactory: any;
  config: any;
  permissions?: Array<object>;
};

export { create, name, description, instructions };
