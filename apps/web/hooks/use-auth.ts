"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export function useAuth() {
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
        const auth = localStorage.getItem("isAuthenticated")
        setIsAuthenticated(auth === "true")
        setIsLoading(false)
    }, [])

    const logout = () => {
        localStorage.removeItem("isAuthenticated")
        setIsAuthenticated(false)
        router.push("/auth")
    }

    return { isAuthenticated, isLoading, logout }
}
