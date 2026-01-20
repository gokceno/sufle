"use client";

import { useState, useMemo } from "react";
import { Thread } from "@/components/thread";
import { createApiChatModelAdapter } from "@/lib/api-chat-model-adapter";
import { AssistantRuntimeProvider, useLocalRuntime } from "@assistant-ui/react";
import { ModelSelector } from "@/components/model-selector";
import { AssistantSidebar } from "@/components/assistant-sidebar";
import { AuthGuard } from "@/components/auth/auth-guard";
import { cn } from "@/lib/utils";

type ModelId = "sufle/sufle-lite" | "sufle/sufle-original" | "sufle/sufle-max";

export default function Page() {
  const [selectedModel, setSelectedModel] = useState<ModelId>("sufle/sufle-original");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const adapter = useMemo(
    () => createApiChatModelAdapter(selectedModel),
    [selectedModel]
  );

  const runtime = useLocalRuntime(adapter);

  const maxWidth = sidebarOpen ? "44rem" : "56rem";

  return (
    <AuthGuard>
      <AssistantRuntimeProvider runtime={runtime}>
        <div className="flex h-screen overflow-hidden">
          {/* Sidebar */}
          <AssistantSidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

          {/* Main Content */}
          <div className="flex flex-1 flex-col transition-all duration-300 ease-in-out">

            {/* Header - Dropdown Alanı */}
            <div className="border-b border-transparent bg-background">
              <div className={cn(
                "flex h-14 w-full items-center transition-all duration-300 ease-in-out",
                sidebarOpen ? "px-4" : "pl-12 pr-4"
              )}>
                <ModelSelector
                  currentModel={selectedModel}
                  onModelChange={setSelectedModel}
                />
              </div>
            </div>

            {/* Thread - Sohbet Alanı */}
            <div
              className="flex-1 overflow-hidden"
              style={{ ["--thread-max-width" as string]: maxWidth }}
            >
              <Thread />
            </div>
          </div>
        </div>
      </AssistantRuntimeProvider>
    </AuthGuard>
  );
}