import { redirect } from 'next/navigation'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { DashboardSidebar } from '@/components/dashboard/dashboard-sidebar'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { TrialExpiredBlocker } from '@/components/dashboard/trial-expired-blocker'
import { PostHogIdentifier } from '@/components/posthog-identifier'
import { getAvatarSignedUrl } from './settings/profile/avatar-actions'
import {
    getCachedUser,
    getCachedOrgMember,
    getCachedProfile,
    getCachedSlackIntegration
} from '@/lib/queries/user'
import { getTrialDaysRemaining, isTrialExpired, getOrganizationSubscription } from '@/lib/stripe/subscription'
import { canCreateSpace } from '@/lib/permissions'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // Use cached queries to avoid duplicate requests
    const { user } = await getCachedUser()

    if (!user) {
        redirect('/login')
    }

    // Fetch organization membership and user profile using cached queries
    const [memberData, profileData] = await Promise.all([
        getCachedOrgMember(user.id),
        getCachedProfile(user.id)
    ])

    // If user has no organization, redirect to onboarding
    if (!memberData.data) {
        redirect('/onboarding')
    }

    // Check if Slack is connected and get subscription info
    let isSlackConnected = false
    let trialDaysRemaining = 0
    let trialExpired = false
    let isTrialing = false
    let spaceLimitReached = false

    if (memberData.data?.organization_id) {
        const [slackData, subscription, daysRemaining, expired, spacePermission] = await Promise.all([
            getCachedSlackIntegration(memberData.data.organization_id),
            getOrganizationSubscription(memberData.data.organization_id),
            getTrialDaysRemaining(memberData.data.organization_id),
            isTrialExpired(memberData.data.organization_id),
            canCreateSpace(memberData.data.organization_id),
        ])
        
        isSlackConnected = !!(slackData.data && slackData.data.enabled)
        trialDaysRemaining = daysRemaining
        trialExpired = expired
        isTrialing = subscription?.status === 'trialing' && !expired
        spaceLimitReached = !spacePermission.allowed
    }

    // Get organization details
    const organization = memberData.data?.organizations && !Array.isArray(memberData.data.organizations)
        ? (memberData.data.organizations as any)
        : null
    
    const orgName = organization?.name || 'Borda'
    
    // Get subscription to determine plan
    let plan: 'trial' | 'growth' | 'scale' = 'trial'
    if (memberData.data?.organization_id) {
        const subscription = await getOrganizationSubscription(memberData.data.organization_id)
        if (subscription?.plan) {
            plan = subscription.plan as 'trial' | 'growth' | 'scale'
        }
    }

    // Generate signed URL for avatar if it exists
    const avatarUrl = profileData.data?.avatar_url
        ? await getAvatarSignedUrl(profileData.data.avatar_url)
        : null

    const userData = {
        name: profileData.data?.full_name || user.email?.split('@')[0] || 'User',
        email: user.email || '',
        avatar: avatarUrl || undefined,
    }

    return (
        <SidebarProvider>
            {/* PostHog user identification */}
            <PostHogIdentifier
                userId={user.id}
                userEmail={user.email || ''}
                userName={profileData.data?.full_name}
                userRole={memberData.data?.role as 'owner' | 'admin' | 'member'}
                createdAt={user.created_at}
                organizationId={memberData.data?.organization_id}
                organizationName={orgName}
                plan={plan}
                isTrialing={isTrialing}
                trialDaysRemaining={trialDaysRemaining}
                industry={organization?.industry}
                companySize={organization?.company_size}
            />
            
            {/* Show blocker modal if trial has expired */}
            {trialExpired && memberData.data?.organization_id && (
                <TrialExpiredBlocker organizationId={memberData.data.organization_id} />
            )}
            
            <DashboardSidebar orgName={orgName} user={userData} isSlackConnected={isSlackConnected} spaceLimitReached={spaceLimitReached} />
            <SidebarInset className="h-screen flex flex-col overflow-hidden">
                <DashboardHeader 
                    trialDaysRemaining={trialDaysRemaining}
                    isTrialing={isTrialing}
                />
                <div className="flex-1 overflow-y-auto">
                    <main className="p-6">
                        {children}
                    </main>
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}
