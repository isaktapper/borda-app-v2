'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { isValidHexColor, normalizeHexColor } from '@/lib/branding'

/**
 * Upload organization logo to Supabase Storage
 */
export async function uploadOrgLogo(organizationId: string, formData: FormData) {
    const supabase = await createClient()

    // Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        console.error('[uploadOrgLogo] Not authenticated')
        return { error: 'Not authenticated' }
    }

    try {
        const file = formData.get('file') as File
        if (!file) {
            console.error('[uploadOrgLogo] No file provided')
            return { error: 'No file provided' }
        }

        // Validate file type
        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp']
        if (!allowedTypes.includes(file.type)) {
            console.error('[uploadOrgLogo] Invalid file type:', file.type)
            return { error: 'Invalid file type. Allowed: PNG, JPG, SVG, WEBP' }
        }

        // Validate file size (2MB max)
        if (file.size > 2 * 1024 * 1024) {
            console.error('[uploadOrgLogo] File too large:', file.size)
            return { error: 'File too large. Max 2MB' }
        }

        // Get file extension
        const fileExt = file.name.split('.').pop()
        const logoPath = `${organizationId}/logo.${fileExt}`

        // Remove old logo if exists
        const { data: org } = await supabase
            .from('organizations')
            .select('logo_path')
            .eq('id', organizationId)
            .single()

        if (org?.logo_path) {
            await supabase.storage.from('branding').remove([org.logo_path])
        }

        // Upload new logo
        const { error: uploadError } = await supabase.storage
            .from('branding')
            .upload(logoPath, file, {
                cacheControl: '3600',
                upsert: true
            })

        if (uploadError) {
            console.error('[uploadOrgLogo] Upload error:', uploadError)
            return { error: uploadError.message }
        }

        // Update organization record
        const { error: updateError } = await supabase
            .from('organizations')
            .update({ logo_path: logoPath })
            .eq('id', organizationId)

        if (updateError) {
            console.error('[uploadOrgLogo] Update error:', updateError)
            return { error: updateError.message }
        }

        revalidatePath('/settings')
        revalidatePath('/projects')

        return { success: true, logoPath }
    } catch (error: any) {
        console.error('[uploadOrgLogo] Unexpected error:', error)
        return { error: error.message || 'Upload failed' }
    }
}

/**
 * Remove organization logo
 */
export async function removeOrgLogo(organizationId: string) {
    const supabase = await createClient()

    // Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Not authenticated' }
    }

    try {
        // Get current logo path
        const { data: org, error: fetchError } = await supabase
            .from('organizations')
            .select('logo_path')
            .eq('id', organizationId)
            .single()

        if (fetchError || !org?.logo_path) {
            return { error: 'No logo to remove' }
        }

        // Remove from storage
        await supabase.storage.from('branding').remove([org.logo_path])

        // Update organization record
        const { error: updateError } = await supabase
            .from('organizations')
            .update({ logo_path: null })
            .eq('id', organizationId)

        if (updateError) {
            return { error: updateError.message }
        }

        revalidatePath('/settings')
        revalidatePath('/projects')

        return { success: true }
    } catch (error: any) {
        console.error('Remove org logo failed:', error)
        return { error: error.message || 'Remove failed' }
    }
}

/**
 * Update organization name
 */
export async function updateOrgName(organizationId: string, name: string) {
    const supabase = await createClient()

    // Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        console.error('[updateOrgName] Not authenticated')
        return { error: 'Not authenticated' }
    }

    try {
        // Validate name
        if (!name || name.trim().length === 0) {
            return { error: 'Organization name cannot be empty' }
        }

        if (name.trim().length > 100) {
            return { error: 'Organization name is too long (max 100 characters)' }
        }

        // Update organization record
        const { error: updateError } = await supabase
            .from('organizations')
            .update({ name: name.trim() })
            .eq('id', organizationId)

        if (updateError) {
            console.error('[updateOrgName] Update error:', updateError)
            return { error: updateError.message }
        }

        revalidatePath('/settings')
        revalidatePath('/projects')

        return { success: true, name: name.trim() }
    } catch (error: any) {
        console.error('[updateOrgName] Unexpected error:', error)
        return { error: error.message || 'Update failed' }
    }
}

/**
 * Update organization brand color
 */
export async function updateOrgBrandColor(organizationId: string, hexColor: string) {
    const supabase = await createClient()

    // Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        console.error('[updateOrgBrandColor] Not authenticated')
        return { error: 'Not authenticated' }
    }

    try {
        // Validate hex color
        if (!isValidHexColor(hexColor)) {
            console.error('[updateOrgBrandColor] Invalid color format:', hexColor)
            return { error: 'Invalid color format. Use hex (e.g. #6366f1)' }
        }

        const normalizedColor = normalizeHexColor(hexColor)

        // Update organization record
        const { error: updateError } = await supabase
            .from('organizations')
            .update({ brand_color: normalizedColor })
            .eq('id', organizationId)
            .select()

        if (updateError) {
            console.error('[updateOrgBrandColor] Update error:', updateError)
            return { error: updateError.message }
        }

        revalidatePath('/settings')
        revalidatePath('/projects')

        return { success: true, color: normalizedColor }
    } catch (error: any) {
        console.error('[updateOrgBrandColor] Unexpected error:', error)
        return { error: error.message || 'Update failed' }
    }
}

/**
 * Update organization background gradient
 */
export async function updateOrgBackgroundGradient(organizationId: string, gradient: string) {
    const supabase = await createClient()

    // Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        console.error('[updateOrgBackgroundGradient] Not authenticated')
        return { error: 'Not authenticated' }
    }

    try {
        // Update organization record
        const { error: updateError } = await supabase
            .from('organizations')
            .update({ background_gradient: gradient })
            .eq('id', organizationId)
            .select()

        if (updateError) {
            console.error('[updateOrgBackgroundGradient] Update error:', updateError)
            return { error: updateError.message }
        }

        revalidatePath('/settings')
        revalidatePath('/projects')

        return { success: true, gradient }
    } catch (error: any) {
        console.error('[updateOrgBackgroundGradient] Unexpected error:', error)
        return { error: error.message || 'Update failed' }
    }
}
