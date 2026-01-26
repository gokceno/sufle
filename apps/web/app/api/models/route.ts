import { NextResponse } from "next/server";
import { config } from "@/lib/config";

const API_URL = config.api.baseUrl;
const API_KEY = config.api.apiKey;

export async function GET() {
    if (!API_URL || !API_KEY || API_KEY.trim() === "") {
        return NextResponse.json(
            { error: "Server is not configured." },
            { status: 500 },
        );
    }

    try {
        const upstream = await fetch(`${API_URL}/models`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${API_KEY}`,
            },
        });

        if (!upstream.ok) {
            const detail = await upstream.text().catch(() => "<unreadable>");

            return NextResponse.json(
                { error: "Failed to fetch models" },
                { status: upstream.status },
            );
        }

        const data = await upstream.json();
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json(
            { error: "Failed to fetch models" },
            { status: 500 },
        );
    }
}
