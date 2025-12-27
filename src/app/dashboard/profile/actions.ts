'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function updateProfileName(fullName: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        console.error('[updateProfileName] Not authenticated')
        return { error: 'Not authenticated' }
    }

    if (!fullName || fullName.trim().length === 0) {
        console.error('[updateProfileName] Name is required')
        return { error: 'Namn krävs' }
    }

    const { error: updateError } = await supabase
        .from('users')
        .update({ full_name: fullName.trim() })
        .eq('id', user.id)

    if (updateError) {
        console.error('[updateProfileName] Database error:', updateError)
        return { error: updateError.message }
    }

    revalidatePath('/dashboard', 'layout')
    return { success: true }
}

export async function uploadAvatar(formData: FormData) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        console.error('[uploadAvatar] Not authenticated')
        return { error: 'Not authenticated' }
    }

    const file = formData.get('file') as File

    if (!file) {
        console.error('[uploadAvatar] No file provided')
        return { error: 'Ingen fil vald' }
    }

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    if (!validTypes.includes(file.type)) {
        console.error('[uploadAvatar] Invalid file type:', file.type)
        return { error: 'Endast PNG, JPG och WEBP stöds' }
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
        console.error('[uploadAvatar] File too large:', file.size)
        return { error: 'Filen är för stor (max 2MB)' }
    }

    // Get file extension
    const fileExt = file.name.split('.').pop()
    const avatarPath = `${user.id}/avatar.${fileExt}`

    // Upload to storage
    const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(avatarPath, file, {
            cacheControl: '3600',
            upsert: true
        })

    if (uploadError) {
        console.error('[uploadAvatar] Storage upload error:', uploadError)
        return { error: uploadError.message }
    }

    // Update user record with avatar PATH (not URL)
    const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: avatarPath })
        .eq('id', user.id)

    if (updateError) {
        console.error('[uploadAvatar] Database update error:', updateError)
        return { error: updateError.message }
    }

    revalidatePath('/dashboard', 'layout')
    return { success: true, avatarPath }
}

export async function removeAvatar() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        console.error('[removeAvatar] Not authenticated')
        return { error: 'Not authenticated' }
    }

    // Update user record to remove avatar_url
    const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: null })
        .eq('id', user.id)

    if (updateError) {
        console.error('[removeAvatar] Database update error:', updateError)
        return { error: updateError.message }
    }

    revalidatePath('/dashboard', 'layout')
    return { success: true }
}
