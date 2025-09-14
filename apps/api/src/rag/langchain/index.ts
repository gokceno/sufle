import {
  RunnableSequence,
  RunnablePassthrough,
} from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { factory as chatFactory } from "../../chat";
import { yaml } from "../../utils";
import { factory as storeFactory } from "../../stores";
import type { Config, RetrievedDoc } from "../../types";
import type { ChatMessage } from "../../types/chat";
import { prompt } from "./prompt";

const config: Config = yaml(process.env.CONFIG_PATH || "sufle.yml");

const initialize = async () => {
  const { initialize, filter } = await storeFactory(
    config.rag.vectorStore.provider,
  );
  const llm = chatFactory(config.rag.chat.provider, config.rag.chat.opts);
  return { store: initialize(), llm, filter };
};

const perform = async (
  query: string,
  permissions?: Array<object>,
): Promise<string> => {
  const { store, llm, filter } = await initialize();
  const retriever = store.asRetriever({
    ...config.rag.retriever.opts,
    ...filter(permissions),
  });

  const chain = RunnableSequence.from([
    {
      context: retriever.pipe((docs: Array<RetrievedDoc>) =>
        docs.map((doc: RetrievedDoc) => doc.pageContent).join("\n\n"),
      ),
      question: new RunnablePassthrough(),
    },
    prompt,
    llm,
    new StringOutputParser(),
  ]);
  return await chain.invoke(query);
};

const tokens = (messages: ChatMessage[]): number => {
  const totalChars = messages.reduce((sum, msg) => sum + msg.content.length, 0);
  return Math.ceil(totalChars / 4);
};

export { perform, tokens };
