'use server'

import { createClient } from '@/lib/supabase/server'
import { sanitizeStoragePath, isValidStoragePath } from '@/lib/storage-security'

/**
 * Check if a string is an external URL (e.g., Google OAuth avatar)
 */
function isExternalUrl(str: string): boolean {
    return str.startsWith('http://') || str.startsWith('https://')
}

/**
 * Get signed URL for avatar (server-side)
 * Handles both Supabase Storage paths and external URLs (e.g., from Google OAuth)
 */
export async function getAvatarSignedUrl(avatarPath: string): Promise<string | null> {
    if (!avatarPath) {
        return null
    }

    // If it's an external URL (e.g., Google OAuth avatar), return it directly
    if (isExternalUrl(avatarPath)) {
        return avatarPath
    }

    // Validate Supabase Storage path
    if (!isValidStoragePath(avatarPath)) {
        return null
    }

    try {
        const supabase = await createClient()
        const safePath = sanitizeStoragePath(avatarPath)
        const { data, error } = await supabase.storage
            .from('avatars')
            .createSignedUrl(safePath, 60 * 60 * 24) // 24 hours

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
