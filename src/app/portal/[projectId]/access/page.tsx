'use client'

import { useState, useEffect, Suspense } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Mail, ArrowRight, Loader2, Sparkles, CheckCircle2 } from 'lucide-react'
import { validatePortalToken, requestPortalAccess } from '@/app/portal/access-actions'
import { toast } from 'sonner'

function AccessContent() {
    const params = useParams()
    const searchParams = useSearchParams()
    const router = useRouter()

    const projectId = params.projectId as string
    const token = searchParams.get('token')

    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [validating, setValidating] = useState(!!token)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (token && projectId) {
            handleAutoLogin()
        }
    }, [token, projectId])

    const handleAutoLogin = async () => {
        setValidating(true)
        const result = await validatePortalToken(projectId, token!)
        if (result?.error) {
            setError(result.error)
            setValidating(false)
        }
        // Redirect is handled by the action
    }

    const handleRequestLink = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email) return

        setLoading(true)
        setError(null)
        const result = await requestPortalAccess(projectId, email)
        setLoading(false)

        if (result.success) {
            setSuccess(true)
            setEmail('')
        } else {
            setError(result.error || 'Något gick fel')
        }
    }

    if (validating) {
        return (
            <div className="flex flex-col items-center justify-center py-12 space-y-6">
                <Loader2 className="size-12 text-primary animate-spin" />
                <div className="text-center space-y-2">
                    <h2 className="text-xl font-bold tracking-tight">Verifierar åtkomst...</h2>
                    <p className="text-sm text-muted-foreground">Vi kontrollerar din länk, ett ögonblick.</p>
                </div>
            </div>
        )
    }

    if (success) {
        return (
            <div className="text-center space-y-8 py-6 animate-in fade-in zoom-in duration-500">
                <div className="size-20 rounded-3xl bg-emerald-500/10 flex items-center justify-center mx-auto shadow-inner">
                    <CheckCircle2 className="size-10 text-emerald-500" />
                </div>
                <div className="space-y-3">
                    <h3 className="text-2xl font-black tracking-tight leading-tight">Kolla din inbox!</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        Om din e-postadress är registrerad för detta projekt har vi skickat en ny åtkomstlänk till dig.
                    </p>
                </div>
                <Button
                    variant="ghost"
                    className="text-xs font-bold uppercase tracking-widest text-primary hover:bg-primary/5"
                    onClick={() => setSuccess(false)}
                >
                    Försök med en annan e-post
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="space-y-3">
                <h2 className="text-xl font-bold tracking-tight leading-tight">Välkommen till projektportalen</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                    Ange din e-postadress för att få en säker åtkomstlänk skickad till dig.
                </p>
            </div>

            <form onSubmit={handleRequestLink} className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">E-postadress</Label>
                    <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/40" />
                        <Input
                            id="email"
                            type="email"
                            required
                            placeholder="namn@foretag.se"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="h-14 pl-12 rounded-2xl border-2 focus-visible:ring-primary/20 bg-muted/5 font-medium"
                        />
                    </div>
                </div>

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
                            Skicka åtkomstlänk
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
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary pb-1">Impel Portal</p>
                    <h1 className="text-3xl font-black tracking-tight leading-tight">Begär åtkomst</h1>
                </div>

                <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="size-8 text-primary animate-spin" /></div>}>
                    <AccessContent />
                </Suspense>
            </Card>
        </div>
    )
}
