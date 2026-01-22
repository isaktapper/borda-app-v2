'use client'

import { useState, useEffect, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Lock } from 'lucide-react'
import { signup, signupWithInvitation } from '@/app/auth/actions'
import Link from 'next/link'
import { GoogleButton, isGoogleAuthEnabled } from '@/components/ui/google-button'
import { trackSignupStarted } from '@/lib/posthog'

interface Invitation {
    id: string
    organizationId: string
    organizationName: string
}

interface SignupFormProps {
    invitation: Invitation | null
    invitedEmail: string | null
}

export function SignupForm({ invitation, invitedEmail }: SignupFormProps) {
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)

    const isInvited = !!invitation

    // Track when user lands on signup page
    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const source = params.get('utm_source') || params.get('ref') || undefined
        trackSignupStarted(source)
    }, [])

    const handleSubmit = async (formData: FormData) => {
        setError(null)
        startTransition(async () => {
            let res
            if (isInvited && invitation) {
                // Add invitation data to form
                formData.set('invitationId', invitation.id)
                formData.set('organizationId', invitation.organizationId)
                res = await signupWithInvitation(formData)
            } else {
                res = await signup(formData)
            }
            
            if (res?.error) {
                setError(res.error)
            }
        })
    }

    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight font-[family-name:var(--font-uxum)]">
                    {isInvited ? `Join ${invitation.organizationName}` : 'Create account'}
                </h1>
                <p className="text-sm text-muted-foreground">
                    {isInvited 
                        ? `You've been invited to join ${invitation.organizationName}`
                        : 'Get started with your free account'
                    }
                </p>
            </div>

            <div className="space-y-4">
                {/* Only show Google signup for non-invited users when enabled */}
                {!isInvited && isGoogleAuthEnabled && (
                    <>
                        <GoogleButton mode="signup" />

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">or</span>
                            </div>
                        </div>
                    </>
                )}

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
                        <div className="relative">
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                required
                                defaultValue={invitedEmail || ''}
                                readOnly={isInvited}
                                placeholder="you@company.com"
                                className={`h-10 rounded-md border-border bg-transparent placeholder:text-muted-foreground/50 ${
                                    isInvited ? 'pr-10 bg-muted/50 cursor-not-allowed' : ''
                                }`}
                            />
                            {isInvited && (
                                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                            )}
                        </div>
                        {isInvited && (
                            <p className="text-xs text-muted-foreground">
                                This email was used for your invitation
                            </p>
                        )}
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

                    <Button type="submit" disabled={isPending} className="w-full h-10 rounded-md font-medium">
                        {isPending ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : isInvited ? (
                            'Accept invitation'
                        ) : (
                            'Create account'
                        )}
                    </Button>
                </form>
            </div>

            {!isInvited && (
                <p className="text-sm text-muted-foreground">
                    Already have an account?{' '}
                    <Link href="/login" className="text-foreground font-medium hover:underline underline-offset-4">
                        Sign in
                    </Link>
                </p>
            )}
        </div>
    )
}
