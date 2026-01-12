'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function UpdatePasswordPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [isValidSession, setIsValidSession] = useState<boolean | null>(null)

    useEffect(() => {
        // Check if user has a valid recovery session
        const checkSession = async () => {
            const supabase = createClient()
            const { data: { session } } = await supabase.auth.getSession()
            setIsValidSession(!!session)
        }
        checkSession()
    }, [])

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setError(null)

        if (password.length < 8) {
            setError('Password must be at least 8 characters.')
            return
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.')
            return
        }

        setLoading(true)

        try {
            const supabase = createClient()
            const { error } = await supabase.auth.updateUser({ password })

            if (error) {
                setError(error.message)
            } else {
                // Sign out the user so they have to log in with new password
                await supabase.auth.signOut()
                setSuccess(true)
                // Redirect to login after 3 seconds
                setTimeout(() => {
                    router.push('/login')
                }, 3000)
            }
        } catch {
            setError('Something went wrong. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    // Loading state while checking session
    if (isValidSession === null) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="size-5 text-muted-foreground animate-spin" />
            </div>
        )
    }

    // No valid session - show error
    if (!isValidSession) {
        return (
            <div className="space-y-6">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight font-[family-name:var(--font-uxum)]">
                        Invalid or expired link
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        The link to reset your password has expired or is invalid.
                    </p>
                </div>

                <Button asChild className="w-full h-10 rounded-md font-medium">
                    <Link href="/forgot-password">
                        Request a new link
                    </Link>
                </Button>
            </div>
        )
    }

    if (success) {
        return (
            <div className="space-y-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-green-600 mb-4">
                        <CheckCircle2 className="size-5" />
                        <span className="font-medium">Password updated!</span>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight font-[family-name:var(--font-uxum)]">
                        Your password has been changed
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        You will be redirected to the login page in a few seconds...
                    </p>
                </div>

                <Button asChild variant="outline" className="w-full h-10 rounded-md font-medium">
                    <Link href="/login">
                        Go to login
                    </Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight font-[family-name:var(--font-uxum)]">
                    Choose a new password
                </h1>
                <p className="text-sm text-muted-foreground">
                    Enter your new password below.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-sm font-medium">New password</Label>
                    <Input
                        id="password"
                        name="password"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        className="h-10 rounded-md border-border bg-transparent placeholder:text-muted-foreground/50"
                    />
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm password</Label>
                    <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Enter password again"
                        className="h-10 rounded-md border-border bg-transparent placeholder:text-muted-foreground/50"
                    />
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <Button type="submit" disabled={loading} className="w-full h-10 rounded-md font-medium">
                    {loading ? <Loader2 className="size-4 animate-spin" /> : 'Update password'}
                </Button>
            </form>
        </div>
    )
}
