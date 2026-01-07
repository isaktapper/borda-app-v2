'use client'

import { Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { login } from '@/app/auth/actions'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'
import { GoogleButton } from '@/components/ui/google-button'

function LoginForm() {
    const searchParams = useSearchParams()
    const redirect = searchParams.get('redirect') || '/projects'
    const errorMsg = searchParams.get('error')

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(errorMsg)

    const handleSubmit = async (formData: FormData) => {
        setLoading(true)
        setError(null)
        const res = await login(formData)
        setLoading(false)
        if (res?.error) {
            setError(res.error)
        }
    }

    return (
        <div className="space-y-4">
            <GoogleButton mode="signin" />

            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">or</span>
                </div>
            </div>

            <form action={handleSubmit} className="space-y-4">
                <input type="hidden" name="redirect" value={redirect} />

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
                        placeholder="Enter your password"
                        className="h-10 rounded-md border-border bg-transparent placeholder:text-muted-foreground/50"
                    />
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <Button type="submit" disabled={loading} className="w-full h-10 rounded-md font-medium">
                    {loading ? <Loader2 className="size-4 animate-spin" /> : 'Sign in'}
                </Button>
            </form>
        </div>
    )
}

export default function LoginPage() {
    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight font-[family-name:var(--font-uxum)]">
                    Welcome back
                </h1>
                <p className="text-sm text-muted-foreground">
                    Enter your credentials to access your account
                </p>
            </div>

            <Suspense fallback={
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="size-5 text-muted-foreground animate-spin" />
                </div>
            }>
                <LoginForm />
            </Suspense>

            <p className="text-sm text-muted-foreground">
                Don't have an account?{' '}
                <Link href="/signup" className="text-foreground font-medium hover:underline underline-offset-4">
                    Sign up
                </Link>
            </p>
        </div>
    )
}
