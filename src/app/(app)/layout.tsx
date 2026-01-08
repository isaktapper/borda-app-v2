import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { DashboardSidebar } from '@/components/dashboard/dashboard-sidebar'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { getAvatarSignedUrl } from './settings/profile/avatar-actions'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Fetch organization membership, user profile, and Slack integration status
    const [memberData, profileData] = await Promise.all([
        supabase
            .from('organization_members')
            .select('role, organization_id, organizations(name)')
            .eq('user_id', user.id)
            .single(),
        supabase
            .from('users')
            .select('full_name, avatar_url')
            .eq('id', user.id)
            .single()
    ])

    // If user has no organization, redirect to onboarding
    if (!memberData.data) {
        redirect('/onboarding')
    }

    // Check if Slack is connected
    let isSlackConnected = false
    if (memberData.data?.organization_id) {
        const { data: slackIntegration } = await supabase
            .from('slack_integrations')
            .select('id, enabled')
            .eq('organization_id', memberData.data.organization_id)
            .is('deleted_at', null)
            .single()
        isSlackConnected = !!(slackIntegration && slackIntegration.enabled)
    }

    const orgName = memberData.data?.organizations && !Array.isArray(memberData.data.organizations)
        ? (memberData.data.organizations as any).name
        : 'Borda'

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
            <DashboardSidebar orgName={orgName} user={userData} isSlackConnected={isSlackConnected} />
            <SidebarInset className="overflow-x-hidden">
                <DashboardHeader />
                <main className="flex-1 p-6 max-w-full overflow-x-hidden">
                    {children}
                </main>
            </SidebarInset>
        </SidebarProvider>
    )
}
