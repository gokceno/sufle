import { NextResponse } from "next/server";
import { config } from "@/lib/config";

const API_URL = config.api.baseUrl;
const API_KEY = config.api.apiKey;
const MODEL_ID = config.api.model;

type IncomingMessage = {
    role: string;
    content: string;
};

type ChatBody = {
    messages?: IncomingMessage[];
    model?: string;
    stream?: boolean;
};

const VALID_ROLES = new Set(["system", "user", "assistant"] as const);

const isRecord = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null;

export async function POST(req: Request) {
    if (!API_URL || !API_KEY || API_KEY.trim() === "") {
        return NextResponse.json(
            { error: "Server is not configured." },
            { status: 500 },
        );
    }

    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (!isRecord(body)) {
        return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const messages = body.messages;
    if (!Array.isArray(messages)) {
        return NextResponse.json({ error: "messages must be an array" }, { status: 400 });
    }
    if (messages.length === 0) {
        return NextResponse.json({ error: "messages must not be empty" }, { status: 400 });
    }
    if (messages.length > 64) {
        return NextResponse.json({ error: "Too many messages" }, { status: 400 });
    }

    // Validate each message shape
    const sanitizedMessages: IncomingMessage[] = [];
    for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        if (!isRecord(msg)) {
            return NextResponse.json({ error: `Invalid message at index ${i}` }, { status: 400 });
        }
        const role = msg.role;
        const content = msg.content;

        if (typeof role !== "string" || !VALID_ROLES.has(role as any)) {
            return NextResponse.json(
                { error: `Invalid role at index ${i}` },
                { status: 400 },
            );
        }
        if (typeof content !== "string") {
            return NextResponse.json(
                { error: `Invalid content at index ${i}` },
                { status: 400 },
            );
        }

        const trimmed = content.trim();
        if (!trimmed) {
            return NextResponse.json(
                { error: `Empty content at index ${i}` },
                { status: 400 },
            );
        }
        if (trimmed.length > 20000) {
            return NextResponse.json(
                { error: `Content too long at index ${i}` },
                { status: 400 },
            );
        }

        sanitizedMessages.push({ role, content: trimmed });
    }

    // Model validation (required by upstream)
    const model = typeof body.model === "string" ? body.model : MODEL_ID;
    if (typeof model !== "string" || model.length === 0 || model.length > 128) {
        return NextResponse.json({ error: "Invalid model" }, { status: 400 });
    }

    const upstreamBody: ChatBody = {
        model,
        messages: sanitizedMessages,
        stream: false, // Explicitly disable streaming in this route. 
        // TODO: If the upstream /chat/completions API adds streaming support, consider wiring through body.stream and implementing streaming handling here.
    };

    const upstream = await fetch(`${API_URL}/chat/completions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify(upstreamBody),
    });

    if (!upstream.ok) {
        // Do NOT leak upstream body to the client; log it server-side only.
        const detail = await upstream.text().catch(() => "<unreadable>");
        console.error("Upstream error:", upstream.status, detail);

        return NextResponse.json(
            { error: "Upstream error" },
            { status: upstream.status },
        );
    }

    const data = await upstream.json();
    return NextResponse.json(data);
}
