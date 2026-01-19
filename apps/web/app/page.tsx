"use client";

import { useState, useMemo } from "react";
import { Thread } from "@/components/thread";
import { createApiChatModelAdapter } from "@/lib/api-chat-model-adapter";
import { AssistantRuntimeProvider, useLocalRuntime } from "@assistant-ui/react";
import { ModelSelector } from "@/components/model-selector";

type ModelId = "sufle/sufle-lite" | "sufle/sufle-original" | "sufle/sufle-max";

export default function Page() {
  const [selectedModel, setSelectedModel] = useState<ModelId>("sufle/sufle-original");

  const adapter = useMemo(
    () => createApiChatModelAdapter(selectedModel),
    [selectedModel]
  );

  const runtime = useLocalRuntime(adapter);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="h-screen flex flex-col">
        <div className="bg-background border-b border-transparent">
          <div
            className="mx-auto flex h-14 w-full items-center"
            style={{ maxWidth: "45.5rem" }}
          >
            <ModelSelector
              currentModel={selectedModel}
              onModelChange={setSelectedModel}
            />
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <Thread />
        </div>
      </div>
    </AssistantRuntimeProvider>
  );
}