"use client"

import { useState, FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/icons/logo"

interface EmailInputProps {
    onSubmit: (email: string) => void
    initialEmail?: string
}

export function EmailInput({ onSubmit, initialEmail = "" }: EmailInputProps) {
    const [email, setEmail] = useState(initialEmail)
    const [error, setError] = useState("")

    const validateEmail = (email: string) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        return re.test(email)
    }

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault()

        if (!email.trim()) {
            setError("Email address is required")
            return
        }

        if (!validateEmail(email)) {
            setError("Please enter a valid email address")
            return
        }

        setError("")
        onSubmit(email)
    }

    return (
        <div className="flex flex-col gap-10">
            {/* Logo */}
            <div className="flex justify-center">
                <Logo className="h-12 w-auto text-foreground" />
            </div>

            {/* Card */}
            <div className="flex flex-col gap-8 rounded-3xl border border-border bg-card p-8 shadow-lg">
                {/* Header */}
                <div className="space-y-2 text-center">
                    <h2 className="font-semibold text-2xl text-foreground">
                        Get started with your e-mail
                    </h2>
                    <p className="text-muted-foreground text-sm">
                        Enter your e-mail to continue.
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <input
                            type="email"
                            placeholder="Enter your e-mail address"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value)
                                setError("")
                            }}
                            className="h-14 w-full rounded-xl border-2 border-input bg-background px-4 py-3 font-medium text-foreground text-sm outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:ring-4 focus:ring-primary/20"
                            autoFocus
                        />
                        {error && (
                            <p className="px-1 text-left text-destructive text-xs">{error}</p>
                        )}
                    </div>

                    <Button
                        type="submit"
                        size="lg"
                        className="h-12 w-full rounded-xl font-semibold cursor-pointer text-base shadow-sm transition-all hover:shadow-md"
                    >
                        Continue
                    </Button>
                </form>

                {/* Footer */}
                <p className="text-center text-muted-foreground/80 text-xs">
                    By continuing, you agree to our{" "}
                    <span className="underline">Terms of Use</span> and acknowledge you have read our{" "}
                    <span className="underline">Privacy Policy</span>.
                </p>
            </div>
        </div>
    )
}
