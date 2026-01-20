"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { EmailInput } from "@/components/auth/email-input"
import { OtpInput } from "@/components/auth/otp-input"

type AuthStep = "email" | "otp"

export default function AuthPage() {
    const [step, setStep] = useState<AuthStep>("email")
    const [email, setEmail] = useState("")
    const router = useRouter()

    const handleEmailSubmit = (submittedEmail: string) => {
        setEmail(submittedEmail)
        setStep("otp")
    }

    const handleOtpComplete = (otp: string) => {
        // Backend olmadığı için doğrudan auth et
        localStorage.setItem("isAuthenticated", "true")
        localStorage.setItem("userEmail", email)
        router.push("/")
    }

    const handleBack = () => {
        setStep("email")
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <div className="w-full max-w-md">
                {step === "email" && (
                    <EmailInput onSubmit={handleEmailSubmit} initialEmail={email} />
                )}
                {step === "otp" && (
                    <OtpInput onComplete={handleOtpComplete} onBack={handleBack} email={email} />
                )}
            </div>
        </div>
    )
}
