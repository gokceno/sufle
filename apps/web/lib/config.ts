import { create } from "@gokceno/konfeti";
import { z } from "zod";
import path from "path";

const configSchema = z.object({
    api: z.object({
        baseUrl: z.string().url(),
        apiKey: z.string().min(1, "API Key boş olamaz"),
        model: z.string(),
    }),
    ui: z.object({
        title: z.string().default("Sufle Chat"),
        welcomeMessage: z.string().default("How can I help you today?"),
    }).optional(),
});

export type Config = z.infer<typeof configSchema>;

const { parse } = create(configSchema);

function loadConfig(): Config {
    if (typeof window !== "undefined") {
        return {
            api: { baseUrl: "", apiKey: "", model: "" },
            ui: {
                title: "Sufle Chat",
                welcomeMessage: "How can I help you today?",
            },
        };
    }


    const fs = require("fs");

    const configPath = path.join(process.cwd(), "sufle.yml");

    if (!fs.existsSync(configPath)) {
        throw new Error(
            `'sufle.yml' dosyası bulunamadı!` +
            `Lütfen projenin ana dizinine (root) 'sufle.yml' dosyasını eklediğinizden emin olun.` +
            `Aranan yol: ${configPath}`
        );
    }

    try {
        return parse(configPath) as Config;
    } catch (error) {
        console.error("'sufle.yml' dosyası formatı geçersiz:");
        console.error(error);
        throw new Error(
            `'sufle.yml' dosyasındaki veriler şemaya uymuyor.` +
            `Terminaldeki detaylı hatayı kontrol edin.`
        );
    }
}

export const config: Config = loadConfig();