import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { JoinOrgForm } from './onboarding-forms'
import { OnboardingWizard } from './onboarding-wizard'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function OnboardingPage({
    searchParams,
}: {
    searchParams: Promise<{ create?: string }>
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !user.email) {
        redirect('/login')
    }

    // Check if already in an org
    const { data: existingMember } = await supabase
        .from('organization_members')
        .select('id')
        .eq('user_id', user.id)
        .single()

    if (existingMember) {
        redirect('/spaces')
    }

    const emailDomain = user.email.split('@')[1].toLowerCase()

    // Check if generic
    const { data: genericDomain } = await supabase
        .from('generic_email_domains')
        .select('domain')
        .eq('domain', emailDomain)
        .single()

    const isGeneric = !!genericDomain
    let matchedOrg = null

    if (!isGeneric) {
        const { data: org } = await supabase
            .from('organizations')
            .select('id, name')
            .eq('domain', emailDomain)
            .single()
        matchedOrg = org
    }

    const params = await searchParams
    const forceCreate = params.create === 'true'

    // If matched org exists and user hasn't chosen to create new
    if (matchedOrg && !forceCreate) {
        return (
            <div className="flex min-h-screen items-center justify-center p-4 bg-muted/20">
                <div className="w-full max-w-md space-y-6">
                    <div className="text-center space-y-2">
                        <h1 className="text-3xl font-bold">Welcome to Borda</h1>
                        <p className="text-muted-foreground">Let&apos;s get you set up.</p>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Join {matchedOrg.name}</CardTitle>
                            <CardDescription>
                                We found an existing workspace for <strong>{emailDomain}</strong>.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <JoinOrgForm orgId={matchedOrg.id} orgName={matchedOrg.name} />

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-background px-2 text-muted-foreground">Or</span>
                                </div>
                            </div>

                            <div className="text-center">
                                <p className="text-sm text-muted-foreground mb-4">Want to create a separate workspace?</p>
                                <Button variant="outline" asChild>
                                    <Link href="/onboarding?create=true">
                                        Create New Workspace
                                    </Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        )
    }

    // Show the onboarding wizard for new organization creation
    return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
            <div className="w-full max-w-2xl space-y-8 py-8">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold">Welcome to Borda</h1>
                    <p className="text-muted-foreground">Let&apos;s set up your workspace in just a few steps.</p>
                </div>

                <OnboardingWizard 
                    domain={isGeneric ? null : emailDomain} 
                    userEmail={user.email}
                />

                {matchedOrg && (
                    <p className="text-center text-sm text-muted-foreground">
                        Changed your mind?{' '}
                        <Link href="/onboarding" className="text-primary hover:underline">
                            Join {matchedOrg.name} instead
                        </Link>
                    </p>
                )}
            </div>
        </div>
    )
}
