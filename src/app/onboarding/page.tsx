import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CreateOrgForm, JoinOrgForm } from './onboarding-forms'

export default async function OnboardingPage() {
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
        redirect('/projects')
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

    return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-muted/20">
            <div className="w-full max-w-md space-y-6">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold">Welcome to Impel</h1>
                    <p className="text-muted-foreground">Let's get you set up.</p>
                </div>

                {matchedOrg ? (
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
                                <CreateOrgForm domain={emailDomain} />
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <CreateOrgForm domain={isGeneric ? null : emailDomain} />
                )}
            </div>
        </div>
    )
}
