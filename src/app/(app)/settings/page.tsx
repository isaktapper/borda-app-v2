import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { SettingsLayout } from '@/components/dashboard/settings-layout'
import { ProfileSection } from '@/components/dashboard/settings/profile-section'
import { TeamSection } from '@/components/dashboard/settings/team-section'
import { OrganizationSection } from '@/components/dashboard/settings/organization-section'
import { TagsSection } from '@/components/dashboard/settings/tags-section'
import { Loader2 } from 'lucide-react'

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return <div>Not authenticated</div>
  }

  // Get user profile data for Profile section
  const { data: userData } = await supabase
    .from('users')
    .select('id, email, full_name, avatar_url')
    .eq('id', user.id)
    .single()

  // Generate signed URL for avatar if exists
  let avatarUrl = null
  if (userData?.avatar_url) {
    const { data } = await supabase.storage
      .from('avatars')
      .createSignedUrl(userData.avatar_url, 60 * 60)
    avatarUrl = data?.signedUrl || null
  }

  const userProfile = userData
    ? { ...userData, avatar_url: avatarUrl }
    : { id: user.id, email: user.email || '', full_name: null, avatar_url: null }

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
        }}
      />
    </div>
  )
}
