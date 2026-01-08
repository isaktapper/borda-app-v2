'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sanitizeStoragePath, sanitizeFileExtension, isValidStoragePath } from '@/lib/storage-security'

interface DownloadFile {
    id: string
    name: string
    size: number
    type: string
    storagePath: string
}

/**
 * Upload a file to Supabase Storage for a file_download block
 * Path: {organizationId}/{spaceId}/downloads/{blockId}/{uuid}-{filename}
 */
export async function uploadFileToDownloadBlock(
    blockId: string,
    spaceId: string,
    organizationId: string,
    file: File
) {
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Not authenticated' }
    }

    try {
        // Generate unique file path with sanitization
        const fileExt = sanitizeFileExtension(file.name.split('.').pop() || 'bin')
        const fileName = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_')
        const uniqueId = crypto.randomUUID()
        const storagePath = sanitizeStoragePath(`${organizationId}/${spaceId}/downloads/${blockId}/${uniqueId}-${fileName}.${fileExt}`)

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('project-files')
            .upload(storagePath, file, {
                cacheControl: '3600',
                upsert: false
            })

        if (uploadError) {
            console.error('Upload error:', uploadError)
            return { error: uploadError.message }
        }

        // Get the block's current content
        const { data: block, error: blockError } = await supabase
            .from('blocks')
            .select('content')
            .eq('id', blockId)
            .single()

        if (blockError) {
            return { error: blockError.message }
        }

        // Create new file object
        const newFile: DownloadFile = {
            id: uniqueId,
            name: file.name,
            size: file.size,
            type: file.type,
            storagePath: uploadData.path
        }

        // Update block content with new file
        const currentFiles = (block.content?.files || []) as DownloadFile[]
        const updatedContent = {
            ...block.content,
            files: [...currentFiles, newFile]
        }

        const { error: updateError } = await supabase
            .from('blocks')
            .update({ content: updatedContent })
            .eq('id', blockId)

        if (updateError) {
            // Try to clean up uploaded file
            if (isValidStoragePath(storagePath)) {
                await supabase.storage.from('project-files').remove([storagePath])
            }
            return { error: updateError.message }
        }

        revalidatePath(`/dashboard/spaces/${spaceId}`)

        return { success: true, file: newFile }
    } catch (error) {
        console.error('Upload failed:', error)
        return { error: 'Upload failed' }
    }
}

/**
 * Remove a file from a file_download block
 */
export async function removeFileFromDownloadBlock(
    blockId: string,
    spaceId: string,
    fileId: string
) {
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Not authenticated' }
    }

    try {
        // Get the block's current content
        const { data: block, error: blockError } = await supabase
            .from('blocks')
            .select('content')
            .eq('id', blockId)
            .single()

        if (blockError) {
            return { error: blockError.message }
        }

        const currentFiles = (block.content?.files || []) as DownloadFile[]
        const fileToRemove = currentFiles.find(f => f.id === fileId)

        if (!fileToRemove) {
            return { error: 'File not found' }
        }

        // Remove file from storage (validate path first)
        if (!isValidStoragePath(fileToRemove.storagePath)) {
            return { error: 'Invalid storage path' }
        }
        const { error: storageError } = await supabase.storage
            .from('project-files')
            .remove([fileToRemove.storagePath])

        if (storageError) {
            console.error('Storage removal error:', storageError)
            // Continue anyway - we still want to update the block
        }

        // Update block content
        const updatedContent = {
            ...block.content,
            files: currentFiles.filter(f => f.id !== fileId)
        }

        const { error: updateError } = await supabase
            .from('blocks')
            .update({ content: updatedContent })
            .eq('id', blockId)

        if (updateError) {
            return { error: updateError.message }
        }

        revalidatePath(`/dashboard/spaces/${spaceId}`)

        return { success: true }
    } catch (error) {
        console.error('Remove file failed:', error)
        return { error: 'Remove failed' }
    }
}

/**
 * Get a signed download URL for a file
 */
export async function getDownloadUrl(storagePath: string) {
    // Validate path to prevent path traversal
    if (!isValidStoragePath(storagePath)) {
        return { error: 'Invalid storage path' }
    }

    const supabase = await createClient()

    try {
        const safePath = sanitizeStoragePath(storagePath)
        const { data, error } = await supabase.storage
            .from('project-files')
            .createSignedUrl(safePath, 3600) // 1 hour expiry

        if (error) {
            console.error('Signed URL error:', error)
            return { error: error.message }
        }

        return { url: data.signedUrl }
    } catch (error) {
        console.error('Get download URL failed:', error)
        return { error: 'Failed to get download URL' }
    }
}

/**
 * Update file_download block metadata (title, description)
 */
export async function updateFileDownloadBlock(
    blockId: string,
    spaceId: string,
    updates: { title?: string; description?: string }
) {
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Not authenticated' }
    }

    try {
        // Get current content
        const { data: block, error: blockError } = await supabase
            .from('blocks')
            .select('content')
            .eq('id', blockId)
            .single()

        if (blockError) {
            return { error: blockError.message }
        }

        // Update content
        const updatedContent = {
            ...block.content,
            ...updates
        }

        const { error: updateError } = await supabase
            .from('blocks')
            .update({ content: updatedContent })
            .eq('id', blockId)

        if (updateError) {
            return { error: updateError.message }
        }

        revalidatePath(`/dashboard/spaces/${spaceId}`)

        return { success: true }
    } catch (error) {
        console.error('Update failed:', error)
        return { error: 'Update failed' }
    }
}
