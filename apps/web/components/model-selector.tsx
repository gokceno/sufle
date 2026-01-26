"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDownIcon, CheckIcon, Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";
import { type Model } from "@/hooks/use-models";

export interface ModelSelectorProps {
    models: Model[];
    currentModel: string | null;
    onModelChange: (modelId: string) => void;
    isLoading?: boolean;
}

function formatModelName(id: string): string {
    const name = id.split("/").pop() || id;
    return name
        .split("-")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

function getModelDescription(id: string): string {
    const name = id.toLowerCase();
    if (name.includes("lite")) return "Fast & light";
    if (name.includes("max")) return "Most capable";
    if (name.includes("original")) return "Balanced performance";
    return "AI model";
}

export function ModelSelector({ models, currentModel, onModelChange, isLoading }: ModelSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);

    const selectedModel = models.find((m) => m.id === currentModel);
    const displayName = selectedModel ? formatModelName(selectedModel.id) : "Select Model";

    if (isLoading) {
        return (
            <Button
                variant="ghost"
                disabled
                className="flex items-center gap-2 px-3 py-2 text-0.4xl font-semibold"
            >
                <Loader2Icon className="size-4 animate-spin" />
                <span>Loading models...</span>
            </Button>
        );
    }

    if (models.length === 0) {
        return (
            <Button
                variant="ghost"
                disabled
                className="flex items-center gap-2 px-3 py-2 text-0.4xl font-semibold text-muted-foreground"
            >
                <span>No models available</span>
            </Button>
        );
    }

    return (
        <div className="relative">
            <Button
                variant="ghost"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 cursor-pointer text-0.4xl font-semibold hover:bg-transparent"
            >
                <span>{displayName}</span>
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
                        {models.map((model) => (
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
                                    <span className="font-medium">{formatModelName(model.id)}</span>
                                    <span className="text-muted-foreground text-xs">{getModelDescription(model.id)}</span>
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
