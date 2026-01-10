'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { isValidHexColor, normalizeHexColor } from '@/lib/branding'
import { sanitizeStoragePath, sanitizeFileExtension, isValidStoragePath } from '@/lib/storage-security'

/**
 * Upload project-specific logo to Supabase Storage
 */
export async function uploadProjectLogo(spaceId: string, organizationId: string, formData: FormData) {
    const supabase = await createClient()

    // Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Not authenticated' }
    }

    try {
        const file = formData.get('file') as File
        if (!file) {
            return { error: 'No file provided' }
        }

        // Validate file type (SVG not supported by Supabase Storage by default)
        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
        if (!allowedTypes.includes(file.type)) {
            return { error: 'Invalid file type. Allowed: PNG, JPG, WEBP' }
        }

        // Validate file size (2MB max)
        if (file.size > 2 * 1024 * 1024) {
            return { error: 'File too large. Max 2MB' }
        }

        // Get file extension and build safe path
        const fileExt = sanitizeFileExtension(file.name.split('.').pop() || 'png')
        const logoPath = sanitizeStoragePath(`${organizationId}/${spaceId}/logo.${fileExt}`)

        // Remove old logo if exists
        const { data: project } = await supabase
            .from('spaces')
            .select('logo_path')
            .eq('id', spaceId)
            .single()

        if (project?.logo_path && isValidStoragePath(project.logo_path)) {
            await supabase.storage.from('branding').remove([project.logo_path])
        }

        // Upload new logo
        const { error: uploadError } = await supabase.storage
            .from('branding')
            .upload(logoPath, file, {
                cacheControl: '3600',
                upsert: true
            })

        if (uploadError) {
            return { error: uploadError.message }
        }

        // Update project record
        const { error: updateError } = await supabase
            .from('spaces')
            .update({ logo_path: logoPath })
            .eq('id', spaceId)

        if (updateError) {
            return { error: updateError.message }
        }

        revalidatePath(`/dashboard/spaces/${spaceId}`)
        revalidatePath(`/space/${spaceId}/shared`)
        return { success: true, logoPath }
    } catch (error: any) {
        console.error('Upload project logo failed:', error)
        return { error: error.message || 'Upload failed' }
    }
}

/**
 * Remove project-specific logo (falls back to organization logo)
 */
export async function removeProjectLogo(spaceId: string) {
    const supabase = await createClient()

    // Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Not authenticated' }
    }

    try {
        // Get current logo path
        const { data: project, error: fetchError } = await supabase
            .from('spaces')
            .select('logo_path')
            .eq('id', spaceId)
            .single()

        if (fetchError || !project?.logo_path) {
            return { error: 'No logo to remove' }
        }

        // Remove from storage (validate path first)
        if (isValidStoragePath(project.logo_path)) {
            await supabase.storage.from('branding').remove([project.logo_path])
        }

        // Update project record (null = use org logo)
        const { error: updateError } = await supabase
            .from('spaces')
            .update({ logo_path: null })
            .eq('id', spaceId)

        if (updateError) {
            return { error: updateError.message }
        }

        revalidatePath(`/dashboard/spaces/${spaceId}`)
        revalidatePath(`/space/${spaceId}/shared`)

        return { success: true }
    } catch (error: any) {
        console.error('Remove project logo failed:', error)
        return { error: error.message || 'Remove failed' }
    }
}

/**
 * Update project brand color (null = use organization color)
 */
export async function updateProjectBrandColor(spaceId: string, hexColor: string | null) {
    const supabase = await createClient()

    // Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Not authenticated' }
    }

    try {
        let normalizedColor: string | null = null

        if (hexColor) {
            // Validate hex color
            if (!isValidHexColor(hexColor)) {
                return { error: 'Invalid color format. Use hex (e.g. #6366f1)' }
            }
            normalizedColor = normalizeHexColor(hexColor)
        }

        // Update project record (null = use org color)
        const { error: updateError } = await supabase
            .from('spaces')
            .update({ brand_color: normalizedColor })
            .eq('id', spaceId)

        if (updateError) {
            return { error: updateError.message }
        }

        revalidatePath(`/dashboard/spaces/${spaceId}`)
        revalidatePath(`/space/${spaceId}/shared`)

        return { success: true, color: normalizedColor }
    } catch (error: any) {
        console.error('Update project brand color failed:', error)
        return { error: error.message || 'Update failed' }
    }
}

/**
 * Update project background gradient (null = use organization gradient)
 */
export async function updateProjectBackgroundGradient(spaceId: string, gradient: string | null) {
    const supabase = await createClient()

    // Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Not authenticated' }
    }

    try {
        // Update project record (null = use org gradient)
        const { error: updateError } = await supabase
            .from('spaces')
            .update({ background_gradient: gradient })
            .eq('id', spaceId)

        if (updateError) {
            return { error: updateError.message }
        }

        revalidatePath(`/dashboard/spaces/${spaceId}`)
        revalidatePath(`/space/${spaceId}/shared`)

        return { success: true, gradient }
    } catch (error: any) {
        console.error('Update project background gradient failed:', error)
        return { error: error.message || 'Update failed' }
    }
}
