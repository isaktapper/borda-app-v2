import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { JoinOrgForm } from './onboarding-forms'
import { OnboardingWizard } from './onboarding-wizard'
import { RequestAccessForm } from './request-access-form'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Suspense } from 'react'
import { AuthEventTracker } from '@/components/auth-event-tracker'

export default async function OnboardingPage({
    searchParams,
}: {
    searchParams: Promise<{ create?: string }>
}) {
    const supabase = await createClient()
    const adminClient = await createAdminClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !user.email) {
        redirect('/login')
    }

    // Check if already in an org (check for user_id match OR invited_email match)
    // Use admin client to bypass RLS for pending invitations
    const { data: existingMember } = await adminClient
        .from('organization_members')
        .select('id, user_id')
        .or(`user_id.eq.${user.id},invited_email.ilike.${user.email}`)
        .is('deleted_at', null)
        .single()

    if (existingMember) {
        // If the membership exists but user_id is not set, this is a pending invite
        // that was approved - the user needs to be linked
        if (!existingMember.user_id) {
            // Update the membership to link the user
            await adminClient
                .from('organization_members')
                .update({ user_id: user.id })
                .eq('id', existingMember.id)
        }
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
    let matchedOrg: { id: string; name: string; join_policy: string | null } | null = null

    if (!isGeneric) {
        const { data: org } = await supabase
            .from('organizations')
            .select('id, name, join_policy')
            .eq('domain', emailDomain)
            .single()
        matchedOrg = org
    }

    const params = await searchParams
    const forceCreate = params.create === 'true'

    // Detect auth method from user metadata
    const authMethod = user.app_metadata?.provider === 'google' ? 'google' : 'email'

    // Get user's full name for the request access form
    const userName = user.user_metadata?.full_name || null

    // If matched org exists and user hasn't chosen to create new
    if (matchedOrg && !forceCreate) {
        // Check join policy - default to invite_only for safety
        const joinPolicy = matchedOrg.join_policy || 'invite_only'

        // If join policy is invite_only, check for existing access request
        if (joinPolicy === 'invite_only') {
            // Check if user already has a pending access request
            const { data: existingRequest } = await adminClient
                .from('access_requests')
                .select('id, status')
                .eq('email', user.email)
                .eq('organization_id', matchedOrg.id)
                .single()

            // If request is pending, show waiting message
            if (existingRequest?.status === 'pending') {
                return (
                    <div className="flex min-h-screen items-center justify-center p-4 bg-muted/20">
                        <Suspense fallback={null}>
                            <AuthEventTracker isNewUser={true} authMethod={authMethod as 'email' | 'google'} />
                        </Suspense>
                        
                        <div className="w-full max-w-md space-y-6">
                            <Card>
                                <CardHeader className="text-center">
                                    <CardTitle>Request Pending</CardTitle>
                                    <CardDescription>
                                        Your request to join <strong>{matchedOrg.name}</strong> is awaiting approval.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="text-center space-y-4">
                                    <p className="text-sm text-muted-foreground">
                                        An administrator will review your request soon. You&apos;ll receive an email when you&apos;ve been approved.
                                    </p>
                                    <div className="pt-4 border-t">
                                        <p className="text-sm text-muted-foreground mb-4">Want to create your own workspace instead?</p>
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

            // Show request access form
            return (
                <div className="flex min-h-screen items-center justify-center p-4 bg-muted/20">
                    {/* Track signup completion for new users */}
                    <Suspense fallback={null}>
                        <AuthEventTracker isNewUser={true} authMethod={authMethod as 'email' | 'google'} />
                    </Suspense>
                    
                    <div className="w-full max-w-md space-y-6">
                        <div className="text-center space-y-2">
                            <h1 className="text-3xl font-bold">Welcome to Borda</h1>
                            <p className="text-muted-foreground">
                                We found an existing workspace for <strong>{emailDomain}</strong>.
                            </p>
                        </div>

                        <RequestAccessForm 
                            orgId={matchedOrg.id} 
                            orgName={matchedOrg.name}
                            userEmail={user.email}
                            userName={userName}
                        />
                    </div>
                </div>
            )
        }

        // If join policy is domain_auto_join, show the auto-join flow
        return (
            <div className="flex min-h-screen items-center justify-center p-4 bg-muted/20">
                {/* Track signup completion for new users */}
                <Suspense fallback={null}>
                    <AuthEventTracker isNewUser={true} authMethod={authMethod as 'email' | 'google'} />
                </Suspense>
                
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
            {/* Track signup completion for new users */}
            <Suspense fallback={null}>
                <AuthEventTracker isNewUser={true} authMethod={authMethod as 'email' | 'google'} />
            </Suspense>
            
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
