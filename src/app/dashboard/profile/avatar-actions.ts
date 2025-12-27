'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * Get signed URL for avatar (server-side)
 */
export async function getAvatarSignedUrl(avatarPath: string): Promise<string | null> {
    if (!avatarPath) {
        return null
    }

    try {
        const supabase = await createClient()
        const { data, error } = await supabase.storage
            .from('avatars')
            .createSignedUrl(avatarPath, 60 * 60 * 24) // 24 hours

        if (error) {
            console.error('[getAvatarSignedUrl] Error:', error)
            return null
        }

        return data.signedUrl
    } catch (error) {
        console.error('[getAvatarSignedUrl] Unexpected error:', error)
        return null
    }
}
