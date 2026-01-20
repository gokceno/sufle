"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDownIcon, CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const MODELS = [
    { id: "sufle/sufle-lite", name: "Sufle Lite", description: "Fast & efficient" },
    { id: "sufle/sufle-original", name: "Sufle Original", description: "Balanced" },
    { id: "sufle/sufle-max", name: "Sufle Max", description: "Most capable" },
] as const;

type ModelId = typeof MODELS[number]["id"];

export interface ModelSelectorProps {
    currentModel: ModelId;
    onModelChange: (modelId: ModelId) => void;
}

export function ModelSelector({ currentModel, onModelChange }: ModelSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);

    const selectedModel = MODELS.find((m) => m.id === currentModel) || MODELS[0];

    return (
        <div className="relative">
            <Button
                variant="ghost"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 cursor-pointer text-xl font-semibold hover:bg-transparent"
            >
                <span>{selectedModel.name}</span>
                <ChevronDownIcon className={cn(
                    "size-4 transition-transform duration-200",
                    isOpen && "rotate-180"
                )} />
            </Button>

            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Dropdown */}
                    <div className="absolute left-0 top-full z-50 mt-2 w-64 rounded-lg bg-popover p-1 shadow-lg">
                        <div className="px-3 py-2 text-muted-foreground text-xs font-semibold">
                            Select Model
                        </div>
                        {MODELS.map((model) => (
                            <button
                                key={model.id}
                                onClick={() => {
                                    onModelChange(model.id);
                                    setIsOpen(false);
                                }}
                                className={cn(
                                    "flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 cursor-pointer text-left text-sm transition-colors hover:bg-accent",
                                    currentModel === model.id && "bg-accent"
                                )}
                            >
                                <div className="flex flex-col">
                                    <span className="font-medium">{model.name}</span>
                                    <span className="text-muted-foreground text-xs">{model.description}</span>
                                </div>
                                {currentModel === model.id && (
                                    <CheckIcon className="size-4 text-primary" />
                                )}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
