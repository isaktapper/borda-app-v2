import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProfileEditor } from '@/components/dashboard/profile-editor'
import { getAvatarSignedUrl } from './avatar-actions'

export default async function ProfilePage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect('/login')
    }

    // Get user profile data
    const { data: profile } = await supabase
        .from('users')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single()

    if (!profile) {
        redirect('/login')
    }

    // Generate signed URL for avatar if it exists
    const avatarUrl = profile.avatar_url ? await getAvatarSignedUrl(profile.avatar_url) : null

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Manage your profile and personal settings
                </p>
            </div>

            <ProfileEditor
                userId={user.id}
                email={user.email || ''}
                initialFullName={profile.full_name || ''}
                initialAvatarUrl={avatarUrl}
            />
        </div>
    )
}
