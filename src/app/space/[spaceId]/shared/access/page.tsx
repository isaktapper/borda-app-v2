'use client'

import { useState, useEffect, Suspense } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Mail, ArrowRight, Loader2, Sparkles, CheckCircle2, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react'
import {
    validatePortalToken,
    getPortalAccessSettings,
    grantPublicAccess,
    validateRestrictedAccess,
    type PortalAccessSettings
} from '@/app/space/access-actions'

function AccessContent() {
    const params = useParams()
    const searchParams = useSearchParams()
    const router = useRouter()

    const spaceId = params.spaceId as string
    const token = searchParams.get('token')

    // State
    const [settings, setSettings] = useState<PortalAccessSettings | null>(null)
    const [loadingSettings, setLoadingSettings] = useState(true)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [validatingToken, setValidatingToken] = useState(!!token)
    const [error, setError] = useState<string | null>(null)

    // Load settings on mount
    useEffect(() => {
        if (token) {
            // If we have a magic link token, validate it directly
            handleTokenValidation()
        } else {
            // Otherwise, load access settings
            loadSettings()
        }
    }, [spaceId, token])

    const loadSettings = async () => {
        setLoadingSettings(true)
        const result = await getPortalAccessSettings(spaceId)
        if (result.success) {
            setSettings(result.data)

            // If public, no password, and no email required - auto-grant access
            if (
                result.data.accessMode === 'public' &&
                !result.data.hasPassword &&
                !result.data.requireEmailForAnalytics &&
                result.data.projectStatus !== 'draft' &&
                result.data.projectStatus !== 'archived'
            ) {
                handlePublicAccess()
            }
        } else {
            setError(result.error)
        }
        setLoadingSettings(false)
    }

    const handleTokenValidation = async () => {
        setValidatingToken(true)
        const result = await validatePortalToken(spaceId, token!)
        if (result?.error) {
            setError(result.error)
            setValidatingToken(false)
            // Fall back to normal access flow
            loadSettings()
        }
        // Redirect is handled by the action
    }

    const handlePublicAccess = async (e?: React.FormEvent) => {
        e?.preventDefault()
        setLoading(true)
        setError(null)

        const result = await grantPublicAccess(
            spaceId,
            settings?.hasPassword ? password : undefined,
            settings?.requireEmailForAnalytics ? email : undefined
        )

        if (result.success) {
            router.push(`/space/${spaceId}/shared`)
        } else {
            setError(result.error)
            setLoading(false)
        }
    }

    const handleRestrictedAccess = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email) return

        setLoading(true)
        setError(null)

        const result = await validateRestrictedAccess(
            spaceId,
            email,
            settings?.hasPassword ? password : undefined
        )

        if (result.success) {
            router.push(`/space/${spaceId}/shared`)
        } else {
            setError(result.error)
            setLoading(false)
        }
    }

    // Show loading while validating magic link token
    if (validatingToken) {
        return (
            <div className="flex flex-col items-center justify-center py-12 space-y-6">
                <Loader2 className="size-12 text-primary animate-spin" />
                <div className="text-center space-y-2">
                    <h2 className="text-xl font-bold tracking-tight">Verifying access...</h2>
                    <p className="text-sm text-muted-foreground">Checking your link, one moment.</p>
                </div>
            </div>
        )
    }

    // Show loading while fetching settings
    if (loadingSettings) {
        return (
            <div className="flex flex-col items-center justify-center py-12 space-y-6">
                <Loader2 className="size-12 text-primary animate-spin" />
                <div className="text-center space-y-2">
                    <h2 className="text-xl font-bold tracking-tight">Loading...</h2>
                </div>
            </div>
        )
    }

    // Show error if project not found or unavailable
    if (!settings || settings.projectStatus === 'draft') {
        return (
            <div className="flex flex-col items-center justify-center py-12 space-y-6">
                <div className="size-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <AlertCircle className="size-8 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="text-center space-y-2">
                    <h2 className="text-xl font-bold tracking-tight">Portal Not Available</h2>
                    <p className="text-sm text-muted-foreground">
                        {error || 'This portal is not ready yet. Please contact your team for more information.'}
                    </p>
                </div>
            </div>
        )
    }

    if (settings.projectStatus === 'archived') {
        return (
            <div className="flex flex-col items-center justify-center py-12 space-y-6">
                <div className="size-16 rounded-full bg-muted flex items-center justify-center">
                    <AlertCircle className="size-8 text-muted-foreground" />
                </div>
                <div className="text-center space-y-2">
                    <h2 className="text-xl font-bold tracking-tight">Portal Archived</h2>
                    <p className="text-sm text-muted-foreground">
                        This portal is no longer available.
                    </p>
                </div>
            </div>
        )
    }

    // Determine what fields to show
    const showEmailField = settings.accessMode === 'restricted' ||
        (settings.accessMode === 'public' && settings.requireEmailForAnalytics)
    const showPasswordField = settings.hasPassword

    // If public, no password, no email required - show "Entering portal..."
    if (settings.accessMode === 'public' && !showPasswordField && !showEmailField) {
        return (
            <div className="flex flex-col items-center justify-center py-12 space-y-6">
                <Loader2 className="size-12 text-primary animate-spin" />
                <div className="text-center space-y-2">
                    <h2 className="text-xl font-bold tracking-tight">Entering portal...</h2>
                </div>
            </div>
        )
    }

    const handleSubmit = settings.accessMode === 'public' ? handlePublicAccess : handleRestrictedAccess

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="space-y-3">
                <h2 className="text-xl font-bold tracking-tight leading-tight">
                    Welcome to {settings.clientName}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                    {settings.accessMode === 'restricted'
                        ? 'Enter your email to access this portal.'
                        : settings.hasPassword
                            ? 'Enter the password to access this portal.'
                            : 'Enter your email to continue.'}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {showEmailField && (
                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">
                            Email
                        </Label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/40" />
                            <Input
                                id="email"
                                type="email"
                                required={settings.accessMode === 'restricted'}
                                placeholder="you@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="h-14 pl-12 rounded-2xl border-2 focus-visible:ring-primary/20 bg-muted/5 font-medium"
                            />
                        </div>
                    </div>
                )}

                {showPasswordField && (
                    <div className="space-y-2">
                        <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">
                            Password
                        </Label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/40" />
                            <Input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                required
                                placeholder="Enter password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="h-14 pl-12 pr-12 rounded-2xl border-2 focus-visible:ring-primary/20 bg-muted/5 font-medium"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground"
                            >
                                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                            </button>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="p-4 rounded-xl bg-destructive/5 text-destructive text-sm font-bold border border-destructive/10 animate-in slide-in-from-top-2">
                        {error}
                    </div>
                )}

                <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-14 rounded-2xl text-base font-black shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-98 transition-all gap-3"
                >
                    {loading ? (
                        <Loader2 className="size-5 animate-spin" />
                    ) : (
                        <>
                            Access Portal
                            <ArrowRight className="size-5" />
                        </>
                    )}
                </Button>
            </form>
        </div>
    )
}

export default function AccessPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50/30 via-background to-emerald-50/30 p-6">
            <Card className="w-full max-w-md p-10 border-2 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)] rounded-[2.5rem] relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    <Sparkles className="size-24" />
                </div>

                <div className="space-y-2 mb-10 relative">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary pb-1">Space Portal</p>
                    <h1 className="text-3xl font-black tracking-tight leading-tight">Access Portal</h1>
                </div>

                <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="size-8 text-primary animate-spin" /></div>}>
                    <AccessContent />
                </Suspense>
            </Card>
        </div>
    )
}
