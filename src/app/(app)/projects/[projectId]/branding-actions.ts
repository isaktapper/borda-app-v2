'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { isValidHexColor, normalizeHexColor } from '@/lib/branding'

/**
 * Upload project-specific logo to Supabase Storage
 */
export async function uploadProjectLogo(projectId: string, organizationId: string, formData: FormData) {
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

        // Validate file type
        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp']
        if (!allowedTypes.includes(file.type)) {
            return { error: 'Invalid file type. Allowed: PNG, JPG, SVG, WEBP' }
        }

        // Validate file size (2MB max)
        if (file.size > 2 * 1024 * 1024) {
            return { error: 'File too large. Max 2MB' }
        }

        // Get file extension
        const fileExt = file.name.split('.').pop()
        const logoPath = `${organizationId}/${projectId}/logo.${fileExt}`

        // Remove old logo if exists
        const { data: project } = await supabase
            .from('projects')
            .select('logo_path')
            .eq('id', projectId)
            .single()

        if (project?.logo_path) {
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
            .from('projects')
            .update({ logo_path: logoPath })
            .eq('id', projectId)

        if (updateError) {
            return { error: updateError.message }
        }

        revalidatePath(`/dashboard/projects/${projectId}`)
        revalidatePath(`/portal/${projectId}`)

        return { success: true, logoPath }
    } catch (error: any) {
        console.error('Upload project logo failed:', error)
        return { error: error.message || 'Upload failed' }
    }
}

/**
 * Remove project-specific logo (falls back to organization logo)
 */
export async function removeProjectLogo(projectId: string) {
    const supabase = await createClient()

    // Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Not authenticated' }
    }

    try {
        // Get current logo path
        const { data: project, error: fetchError } = await supabase
            .from('projects')
            .select('logo_path')
            .eq('id', projectId)
            .single()

        if (fetchError || !project?.logo_path) {
            return { error: 'No logo to remove' }
        }

        // Remove from storage
        await supabase.storage.from('branding').remove([project.logo_path])

        // Update project record (null = use org logo)
        const { error: updateError } = await supabase
            .from('projects')
            .update({ logo_path: null })
            .eq('id', projectId)

        if (updateError) {
            return { error: updateError.message }
        }

        revalidatePath(`/dashboard/projects/${projectId}`)
        revalidatePath(`/portal/${projectId}`)

        return { success: true }
    } catch (error: any) {
        console.error('Remove project logo failed:', error)
        return { error: error.message || 'Remove failed' }
    }
}

/**
 * Update project brand color (null = use organization color)
 */
export async function updateProjectBrandColor(projectId: string, hexColor: string | null) {
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
            .from('projects')
            .update({ brand_color: normalizedColor })
            .eq('id', projectId)

        if (updateError) {
            return { error: updateError.message }
        }

        revalidatePath(`/dashboard/projects/${projectId}`)
        revalidatePath(`/portal/${projectId}`)

        return { success: true, color: normalizedColor }
    } catch (error: any) {
        console.error('Update project brand color failed:', error)
        return { error: error.message || 'Update failed' }
    }
}

/**
 * Update project background gradient (null = use organization gradient)
 */
export async function updateProjectBackgroundGradient(projectId: string, gradient: string | null) {
    const supabase = await createClient()

    // Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Not authenticated' }
    }

    try {
        // Update project record (null = use org gradient)
        const { error: updateError } = await supabase
            .from('projects')
            .update({ background_gradient: gradient })
            .eq('id', projectId)

        if (updateError) {
            return { error: updateError.message }
        }

        revalidatePath(`/dashboard/projects/${projectId}`)
        revalidatePath(`/portal/${projectId}`)

        return { success: true, gradient }
    } catch (error: any) {
        console.error('Update project background gradient failed:', error)
        return { error: error.message || 'Update failed' }
    }
}
