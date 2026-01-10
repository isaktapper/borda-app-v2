import { Suspense } from 'react'
import { SettingsLayout } from '@/components/dashboard/settings-layout'
import { ProfileSection } from '@/components/dashboard/settings/profile-section'
import { TeamSection } from '@/components/dashboard/settings/team-section'
import { OrganizationSection } from '@/components/dashboard/settings/organization-section'
import { TagsSection } from '@/components/dashboard/settings/tags-section'
import { BillingSection } from '@/components/dashboard/settings/billing-section'
import { Loader2 } from 'lucide-react'
import { getCachedUser, getCachedProfile, getCachedOrgMember } from '@/lib/queries/user'
import { getAvatarSignedUrl } from './profile/avatar-actions'
import { getOrganizationSubscription, getTrialDaysRemaining } from '@/lib/stripe/subscription'

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  // Use cached user query (deduplicates with layout)
  const { user } = await getCachedUser()

  if (!user) {
    return <div>Not authenticated</div>
  }

  // Use cached profile and org member query (deduplicates with layout)
  const [{ data: userData }, { data: memberData }] = await Promise.all([
    getCachedProfile(user.id),
    getCachedOrgMember(user.id)
  ])

  // Generate signed URL for avatar if exists
  let avatarUrl = null
  if (userData?.avatar_url) {
    avatarUrl = await getAvatarSignedUrl(userData.avatar_url)
  }

  const userProfile = {
    id: user.id,
    email: user.email || '',
    full_name: userData?.full_name || null,
    avatar_url: avatarUrl
  }

  // Get billing data
  let subscription = null
  let trialDaysRemaining = 0
  let organizationName = 'Organization'
  
  if (memberData?.organization_id) {
    const orgData = memberData.organizations && !Array.isArray(memberData.organizations)
      ? memberData.organizations as { name: string }
      : null
    organizationName = orgData?.name || 'Organization'
    
    subscription = await getOrganizationSubscription(memberData.organization_id)
    trialDaysRemaining = await getTrialDaysRemaining(memberData.organization_id)
  }

  const canManageBilling = memberData?.role === 'owner'

  // Await searchParams in Next.js 16
  const params = await searchParams
  const tab = params.tab || 'profile'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b pb-4">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your workspace and profile settings
        </p>
      </div>

      {/* Settings Layout with Sidebar */}
      <SettingsLayout
        defaultTab="profile"
        sections={{
          profile: <ProfileSection user={userProfile} />,
          team: (
            <Suspense fallback={
              <div className="flex items-center justify-center py-12">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
              </div>
            }>
              <TeamSection />
            </Suspense>
          ),
          organization: (
            <Suspense fallback={
              <div className="flex items-center justify-center py-12">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
              </div>
            }>
              <OrganizationSection />
            </Suspense>
          ),
          tags: (
            <Suspense fallback={
              <div className="flex items-center justify-center py-12">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
              </div>
            }>
              <TagsSection />
            </Suspense>
          ),
          billing: memberData?.organization_id ? (
            <BillingSection 
              organizationId={memberData.organization_id}
              organizationName={organizationName}
              subscription={subscription}
              trialDaysRemaining={trialDaysRemaining}
              canManageBilling={canManageBilling}
              userRole={memberData.role || 'member'}
            />
          ) : null,
        }}
      />
    </div>
  )
}
