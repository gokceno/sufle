"use client"

import { useState, useRef, KeyboardEvent, ClipboardEvent, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { Logo } from "@/components/icons/logo"
import { cn } from "@/lib/utils"

interface OtpInputProps {
    onComplete: (otp: string) => void
    onBack: () => void
    email: string
}

export function OtpInput({ onComplete, onBack, email }: OtpInputProps) {
    const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""])
    const [countdown, setCountdown] = useState(120)
    const [showSuccess, setShowSuccess] = useState(false)
    const inputRefs = useRef<(HTMLInputElement | null)[]>([])

    useEffect(() => {
        inputRefs.current[0]?.focus()
    }, [])

    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => {
                setCountdown(countdown - 1)
            }, 1000)
            return () => clearTimeout(timer)
        }
    }, [countdown])

    const handleChange = (index: number, value: string) => {
        if (value && !/^[a-zA-Z0-9]$/.test(value)) return

        const newOtp = [...otp]
        newOtp[index] = value.toUpperCase()
        setOtp(newOtp)

        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus()
        }
    }

    const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus()
        }
    }

    const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault()
        const pastedData = e.clipboardData.getData("text/plain").slice(0, 6)

        if (!/^[a-zA-Z0-9]+$/.test(pastedData)) return

        const newOtp = [...otp]
        pastedData.split("").forEach((char, i) => {
            if (i < 6) newOtp[i] = char.toUpperCase()
        })
        setOtp(newOtp)

        const lastIndex = Math.min(pastedData.length, 5)
        inputRefs.current[lastIndex]?.focus()
    }

    const handleSubmit = () => {
        const otpValue = otp.join("")
        if (otpValue.length === 6) {
            onComplete(otpValue)
        }
    }

    const handleResend = () => {
        setCountdown(120)
        setShowSuccess(true)
        setTimeout(() => {
            setShowSuccess(false)
        }, 3000)
    }

    const isComplete = otp.every(digit => digit !== "")

    return (
        <div className="flex flex-col gap-8">
            {/* Logo */}
            <div className="flex justify-center">
                <Logo className="h-12 w-auto text-foreground" />
            </div>

            {/* Card */}
            <div className="relative flex flex-col gap-8 rounded-3xl border border-border bg-card p-8 shadow-lg">
                {/* Back Button */}
                <button
                    onClick={onBack}
                    className="absolute top-6 left-6 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                    <ArrowLeft className="h-4 w-4" />
                </button>

                {/* Header */}
                <div className="space-y-2 pt-8 text-center">
                    <h2 className="font-semibold text-2xl text-foreground">
                        Verify your e-mail
                    </h2>
                    <p className="text-muted-foreground text-sm">
                        We've sent you a 6-digit code,<br />enter it below to confirm your e-mail.
                    </p>
                </div>

                {/* OTP Inputs */}
                <div className="flex justify-center gap-2">
                    {otp.map((digit, index) => (
                        <input
                            key={index}
                            ref={el => { inputRefs.current[index] = el }}
                            type="text"
                            inputMode="text"
                            maxLength={1}
                            value={digit}
                            onChange={e => handleChange(index, e.target.value)}
                            onKeyDown={e => handleKeyDown(index, e)}
                            onPaste={index === 0 ? handlePaste : undefined}
                            className={cn(
                                "h-14 w-12 rounded-xl border-2 bg-background text-center font-bold text-xl text-foreground outline-none transition-all",
                                "focus:border-primary focus:ring-4 focus:ring-primary/20",
                                digit ? "border-primary" : "border-input"
                            )}
                        />
                    ))}
                </div>

                {/* Submit Button */}
                <Button
                    onClick={handleSubmit}
                    disabled={!isComplete}
                    size="lg"
                    className="h-12 w-full rounded-xl font-semibold cursor-pointer text-base shadow-sm transition-all hover:shadow-md disabled:opacity-50"
                >
                    Verify
                </Button>

                {/* Resend */}
                <div className="text-center text-sm">
                    {showSuccess ? (
                        <p className="text-green-600 font-medium">
                            Code resent successfully!
                        </p>
                    ) : (
                        <p className="text-muted-foreground">
                            Didn't receive the code?{" "}
                            {countdown > 0 ? (
                                <span className="font-medium text-muted-foreground/60">
                                    Resend Code ({countdown}s)
                                </span>
                            ) : (
                                <button
                                    onClick={handleResend}
                                    className="font-medium text-primary transition-colors hover:text-primary/80"
                                >
                                    Resend Code
                                </button>
                            )}
                        </p>
                    )}
                </div>
            </div>
        </div>
    )
}
