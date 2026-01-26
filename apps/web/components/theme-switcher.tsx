"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"

export function ThemeSwitcher() {
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = React.useState(false)

    // Hydration hatasını önlemek için
    React.useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return (
            <Button variant="ghost" className="w-full justify-start gap-2" disabled>
                <span className="size-4" />
                <span className="opacity-0">Loading...</span>
            </Button>
        )
    }

    return (
        <Button
            variant="ghost"
            className="w-full cursor-pointer justify-start gap-2 text-muted-foreground hover:text-foreground h-auto"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
            <div className="relative flex items-center justify-center size-4 shrink-0">
                <Sun className="absolute h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </div>

            <span>
                {theme === "dark" ? "Dark mode" : "Light mode"}
            </span>
        </Button>
    )
}