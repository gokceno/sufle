"use client"

import { useEffect, useState } from "react"

export interface Model {
    id: string
    owned_by: string
    supports_streaming: boolean
    object: "model"
    created: number
}

interface ModelsResponse {
    object: "list"
    data: Model[]
}

export function useModels() {
    const [models, setModels] = useState<Model[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchModels = async () => {
            try {
                setIsLoading(true)
                setError(null)

                const response = await fetch("/api/models")

                if (!response.ok) {
                    throw new Error("Failed to fetch models")
                }

                const data: ModelsResponse = await response.json()
                setModels(data.data || [])
            } catch (err) {
                console.error("Error fetching models:", err)
                setError(err instanceof Error ? err.message : "Unknown error")
                setModels([])
            } finally {
                setIsLoading(false)
            }
        }

        fetchModels()
    }, [])

    return { models, isLoading, error }
}
