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

export async function POST(req: Request) {
    if (!API_URL || !API_KEY) {
        return NextResponse.json(
            { error: "API_URL or API_KEY is not configured on the server" },
            { status: 500 },
        );
    }

    let body: ChatBody;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (!Array.isArray(body.messages)) {
        return NextResponse.json({ error: "messages must be an array" }, { status: 400 });
    }

    const upstreamBody = {
        model: body.model || MODEL_ID,
        messages: body.messages,
        stream: false, // upstream currently does not support streaming
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
        const text = await upstream.text();
        return NextResponse.json(
            {
                error: "Upstream error",
                status: upstream.status,
                detail: text,
            },
            { status: upstream.status },
        );
    }

    const data = await upstream.json();
    return NextResponse.json(data);
}
