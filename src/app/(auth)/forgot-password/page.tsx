'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [email, setEmail] = useState('')

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const supabase = createClient()
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/callback`,
            })

            if (error) {
                setError(error.message)
            } else {
                setSuccess(true)
            }
        } catch {
            setError('Something went wrong. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="space-y-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-green-600 mb-4">
                        <CheckCircle2 className="size-5" />
                        <span className="font-medium">Email sent!</span>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight font-[family-name:var(--font-uxum)]">
                        Check your inbox
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        We've sent a link to <strong>{email}</strong> to reset your password.
                    </p>
                </div>

                <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Didn't receive the email? Check your spam folder or{' '}
                        <button
                            onClick={() => {
                                setSuccess(false)
                                setEmail('')
                            }}
                            className="text-foreground font-medium hover:underline underline-offset-4"
                        >
                            try again
                        </button>
                    </p>

                    <Link
                        href="/login"
                        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeft className="size-4" />
                        Back to login
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight font-[family-name:var(--font-uxum)]">
                    Forgot password?
                </h1>
                <p className="text-sm text-muted-foreground">
                    Enter your email address and we'll send you a link to reset your password.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                    <Input
                        id="email"
                        name="email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com"
                        className="h-10 rounded-md border-border bg-transparent placeholder:text-muted-foreground/50"
                    />
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <Button type="submit" disabled={loading} className="w-full h-10 rounded-md font-medium">
                    {loading ? <Loader2 className="size-4 animate-spin" /> : 'Send reset link'}
                </Button>
            </form>

            <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
                <ArrowLeft className="size-4" />
                Back to login
            </Link>
        </div>
    )
}
