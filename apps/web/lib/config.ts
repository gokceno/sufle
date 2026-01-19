import { create } from "@gokceno/konfeti";
import { z } from "zod";
import path from "path";

const configSchema = z.object({
    api: z.object({
        baseUrl: z.string().url(),
        apiKey: z.string(),
        model: z.string(),
    }),
    ui: z.object({
        title: z.string().default("Sufle Chat"),
        welcomeMessage: z.string().default("How can I help you today?"),
    }).optional(),
});

export type Config = z.infer<typeof configSchema>;

const { parse } = create(configSchema);

// Parse config from sufle.yml in the root of the web app
export const config: Config = parse(path.join(process.cwd(), "sufle.yml")) as Config;
