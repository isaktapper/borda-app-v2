'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { signup } from '@/app/auth/actions'
import Link from 'next/link'
import { GoogleButton } from '@/components/ui/google-button'
import { trackSignupStarted } from '@/lib/posthog'

export default function SignupPage() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Track when user lands on signup page
    useEffect(() => {
        // Get UTM source from URL params if available
        const params = new URLSearchParams(window.location.search)
        const source = params.get('utm_source') || params.get('ref') || undefined
        trackSignupStarted(source)
    }, [])

    const handleSubmit = async (formData: FormData) => {
        setLoading(true)
        setError(null)
        const res = await signup(formData)
        setLoading(false)
        if (res?.error) {
            setError(res.error)
        }
    }

    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight font-[family-name:var(--font-uxum)]">
                    Create account
                </h1>
                <p className="text-sm text-muted-foreground">
                    Get started with your free account
                </p>
            </div>

            <div className="space-y-4">
                <GoogleButton mode="signup" />

                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">or</span>
                    </div>
                </div>

                <form action={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="fullName" className="text-sm font-medium">Full name</Label>
                        <Input
                            id="fullName"
                            name="fullName"
                            required
                            placeholder="John Doe"
                            className="h-10 rounded-md border-border bg-transparent placeholder:text-muted-foreground/50"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            required
                            placeholder="you@company.com"
                            className="h-10 rounded-md border-border bg-transparent placeholder:text-muted-foreground/50"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                        <Input
                            id="password"
                            name="password"
                            type="password"
                            required
                            minLength={8}
                            placeholder="At least 8 characters"
                            className="h-10 rounded-md border-border bg-transparent placeholder:text-muted-foreground/50"
                        />
                    </div>

                    {error && <p className="text-sm text-destructive">{error}</p>}

                    <Button type="submit" disabled={loading} className="w-full h-10 rounded-md font-medium">
                        {loading ? <Loader2 className="size-4 animate-spin" /> : 'Create account'}
                    </Button>
                </form>
            </div>

            <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link href="/login" className="text-foreground font-medium hover:underline underline-offset-4">
                    Sign in
                </Link>
            </p>
        </div>
    )
}
