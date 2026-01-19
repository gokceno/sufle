import type {
    ChatModelAdapter,
    ChatModelRunOptions,
    ChatModelRunResult,
} from "@assistant-ui/react";

/**
 * Client-side adapter that talks ONLY to our Next.js API route (`/api/chat`).
 * No secrets are read here; the server route injects Authorization.
 */
const API_ROUTE = "/api/chat";

const toPlainText = (msg: ChatModelRunOptions["messages"][number]): string => {
    if (typeof msg.content === "string") return msg.content;
    // Join all text parts; ignore attachments/tools for now.
    return msg.content
        .filter((part) => part.type === "text" && "text" in part)
        .map((part) => (part as { text: string }).text)
        .join("\n")
        .trim();
};

/**
 * Creates a chat model adapter with a specific model ID
 */
export const createApiChatModelAdapter = (modelId?: string): ChatModelAdapter => ({
    async run(options: ChatModelRunOptions): Promise<ChatModelRunResult> {
        const { messages, abortSignal } = options;

        const openAIMessages = messages.map((msg) => ({
            role: msg.role,
            content: toPlainText(msg),
        }));

        try {
            const response = await fetch(API_ROUTE, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: openAIMessages,
                    model: modelId, // Pass model from UI selection
                    stream: false,
                }),
                signal: abortSignal,
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`API error: ${response.status} ${response.statusText}: ${text}`);
            }

            const data = await response.json();
            const assistantMessage = data.choices?.[0]?.message;

            return {
                content: assistantMessage?.content
                    ? [{ type: "text" as const, text: assistantMessage.content }]
                    : [],
                status: { type: "complete" as const, reason: "stop" },
            };
        } catch (error) {
            if (error instanceof Error && error.name === "AbortError") {
                return {
                    content: [],
                    status: { type: "incomplete" as const, reason: "cancelled" },
                };
            }
            throw error;
        }
    },
});