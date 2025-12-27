'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Mail, Loader2, ArrowRight, UserPlus, User, Key } from 'lucide-react'
import { signup } from '@/app/auth/actions'
import Link from 'next/link'

export default function SignupPage() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

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
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50/30 via-background to-emerald-50/30 p-6">
            <Card className="w-full max-w-md p-10 border-2 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)] rounded-[2.5rem] relative overflow-hidden">
                <div className="space-y-2 mb-10 relative">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary pb-1">Börja din resa</p>
                    <h1 className="text-3xl font-black tracking-tight leading-tight px-1">Skapa konto</h1>
                </div>

                <form action={handleSubmit} className="space-y-6 animate-in fade-in duration-700">
                    <div className="space-y-2">
                        <Label htmlFor="fullName" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Fullständigt namn</Label>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/40" />
                            <Input
                                id="fullName"
                                name="fullName"
                                required
                                placeholder="Namn Namnsson"
                                className="h-14 pl-12 rounded-2xl border-2 focus-visible:ring-primary/20 bg-muted/5 font-medium"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">E-postadress</Label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/40" />
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                required
                                placeholder="namn@foretag.se"
                                className="h-14 pl-12 rounded-2xl border-2 focus-visible:ring-primary/20 bg-muted/5 font-medium"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password" title="Password" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Lösenord</Label>
                        <div className="relative">
                            <Key className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/40" />
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                required
                                minLength={8}
                                placeholder="••••••••"
                                className="h-14 pl-12 rounded-2xl border-2 focus-visible:ring-primary/20 bg-muted/5"
                            />
                        </div>
                        <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest ml-1">Minst 8 tecken</p>
                    </div>

                    {error && (
                        <div className="p-4 rounded-xl bg-destructive/5 text-destructive text-sm font-bold border border-destructive/10">
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
                                Skapa konto
                                <UserPlus className="size-5" />
                            </>
                        )}
                    </Button>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-xs text-muted-foreground font-medium">
                        Har du redan ett konto?{' '}
                        <Link href="/login" className="text-primary font-bold hover:underline underline-offset-4">
                            Logga in här
                        </Link>
                    </p>
                </div>
            </Card>
        </div>
    )
}
