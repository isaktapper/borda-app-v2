'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sanitizeStoragePath, sanitizeFileExtension, isValidStoragePath } from '@/lib/storage-security'

/**
 * Upload client/customer logo to Supabase Storage
 */
export async function uploadClientLogo(spaceId: string, organizationId: string, formData: FormData) {
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

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            return { error: 'File too large. Max 5MB' }
        }

        // Get file extension and build safe path
        const fileExt = sanitizeFileExtension(file.name.split('.').pop() || 'png')
        const logoPath = sanitizeStoragePath(`${organizationId}/${spaceId}/client-logo.${fileExt}`)

        // Remove old logo if exists
        const { data: project } = await supabase
            .from('spaces')
            .select('client_logo_url')
            .eq('id', spaceId)
            .single()

        if (project?.client_logo_url) {
            // Extract path from URL if it's a full URL
            const oldPath = project.client_logo_url.includes('/')
                ? project.client_logo_url.split('/client-logos/')[1]
                : project.client_logo_url

            if (oldPath && isValidStoragePath(oldPath)) {
                await supabase.storage.from('client-logos').remove([oldPath])
            }
        }

        // Upload new logo
        const { error: uploadError } = await supabase.storage
            .from('client-logos')
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
            .update({ client_logo_url: logoPath })
            .eq('id', spaceId)

        if (updateError) {
            return { error: updateError.message }
        }

        revalidatePath(`/spaces/${spaceId}`)
        revalidatePath(`/space/${spaceId}/shared`)

        return { success: true, logoPath }
    } catch (error: any) {
        console.error('Upload client logo failed:', error)
        return { error: error.message || 'Upload failed' }
    }
}

/**
 * Get signed URL for client logo
 */
export async function getClientLogoUrl(logoPath: string | null) {
    if (!logoPath || !isValidStoragePath(logoPath)) return null

    const supabase = await createClient()

    try {
        const safePath = sanitizeStoragePath(logoPath)
        const { data } = await supabase.storage
            .from('client-logos')
            .createSignedUrl(safePath, 3600) // 1 hour expiry

        return data?.signedUrl || null
    } catch (error) {
        console.error('Get client logo URL failed:', error)
        return null
    }
}

/**
 * Remove client logo
 */
export async function removeClientLogo(spaceId: string) {
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
            .select('client_logo_url')
            .eq('id', spaceId)
            .single()

        if (fetchError || !project?.client_logo_url) {
            return { error: 'No logo to remove' }
        }

        // Extract path from URL if needed
        const logoPath = project.client_logo_url.includes('/')
            ? project.client_logo_url.split('/client-logos/')[1]
            : project.client_logo_url

        // Remove from storage (validate path first)
        if (logoPath && isValidStoragePath(logoPath)) {
            await supabase.storage.from('client-logos').remove([logoPath])
        }

        // Update project record
        const { error: updateError } = await supabase
            .from('spaces')
            .update({ client_logo_url: null })
            .eq('id', spaceId)

        if (updateError) {
            return { error: updateError.message }
        }

        revalidatePath(`/spaces/${spaceId}`)
        revalidatePath(`/space/${spaceId}/shared`)

        return { success: true }
    } catch (error: any) {
        console.error('Remove client logo failed:', error)
        return { error: error.message || 'Remove failed' }
    }
}
