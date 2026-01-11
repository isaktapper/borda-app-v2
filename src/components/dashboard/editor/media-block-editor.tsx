'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Image as ImageIcon,
    Loader2,
    Upload,
    Trash2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { sanitizeStoragePath, sanitizeFileExtension, isValidStoragePath } from '@/lib/storage-security'
import { BlockEditorWrapper } from './block-editor-wrapper'
import { Progress } from '@/components/ui/progress'

interface MediaBlockContent {
    title?: string
    description?: string
    imageUrl?: string
    storagePath?: string
    layout?: 'left' | 'right' | 'full'
    aspectRatio?: 'auto' | '16:9' | '4:3' | '1:1' | '3:2'
    imageFit?: 'cover' | 'contain'
}

interface MediaBlockEditorProps {
    blockId: string
    spaceId?: string
    content: MediaBlockContent
    onChange: (content: MediaBlockContent) => void
}

const LAYOUT_OPTIONS = [
    { value: 'left', label: 'Left' },
    { value: 'right', label: 'Right' },
    { value: 'full', label: 'Full Width' },
] as const

const ASPECT_RATIO_OPTIONS = [
    { value: 'auto', label: 'Auto' },
    { value: '16:9', label: '16:9' },
    { value: '4:3', label: '4:3' },
    { value: '1:1', label: '1:1' },
    { value: '3:2', label: '3:2' },
] as const

const IMAGE_FIT_OPTIONS = [
    { value: 'cover', label: 'Cover' },
    { value: 'contain', label: 'Contain' },
] as const

export function MediaBlockEditor({ blockId, spaceId, content, onChange }: MediaBlockEditorProps) {
    const [uploading, setUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState(0)

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Validate it's an image
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file')
            return
        }

        if (!spaceId || !blockId) {
            alert('The project must be saved before images can be uploaded')
            return
        }

        setUploading(true)
        setUploadProgress(10)

        try {
            const supabase = createClient()

            // Get project to find organizationId
            const { data: project, error: projectError } = await supabase
                .from('spaces')
                .select('organization_id')
                .eq('id', spaceId)
                .single()

            if (projectError || !project) {
                throw new Error('Could not find project')
            }

            setUploadProgress(30)

            // Remove old image if exists
            if (content.storagePath && isValidStoragePath(content.storagePath)) {
                await supabase.storage
                    .from('project-files')
                    .remove([content.storagePath])
            }

            setUploadProgress(50)

            // Generate unique file path
            const fileExt = sanitizeFileExtension(file.name.split('.').pop() || 'jpg')
            const uniqueId = crypto.randomUUID()
            const storagePath = sanitizeStoragePath(
                `${project.organization_id}/${spaceId}/media/${blockId}/${uniqueId}.${fileExt}`
            )

            // Upload to Supabase Storage
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('project-files')
                .upload(storagePath, file, {
                    cacheControl: '3600',
                    upsert: false
                })

            if (uploadError) {
                console.error('Upload error:', uploadError)
                throw new Error(`Could not upload image: ${uploadError.message}`)
            }

            setUploadProgress(80)

            // Create signed URL for display (valid for 7 days)
            const { data: signedData, error: signedError } = await supabase.storage
                .from('project-files')
                .createSignedUrl(uploadData.path, 60 * 60 * 24 * 7) // 7 days

            if (signedError) {
                console.error('Signed URL error:', signedError)
                throw new Error('Could not create image URL')
            }

            setUploadProgress(100)

            // Update content - store both storagePath (permanent) and imageUrl (for display)
            onChange({
                ...content,
                imageUrl: signedData.signedUrl,
                storagePath: uploadData.path
            })

        } catch (error: any) {
            console.error('Upload failed:', error)
            alert(error.message || 'Could not upload image')
        } finally {
            setUploading(false)
            setUploadProgress(0)
            e.target.value = '' // Reset input
        }
    }

    const handleRemoveImage = async () => {
        if (!content.storagePath) return

        try {
            const supabase = createClient()

            if (isValidStoragePath(content.storagePath)) {
                await supabase.storage
                    .from('project-files')
                    .remove([content.storagePath])
            }

            onChange({
                ...content,
                imageUrl: undefined,
                storagePath: undefined
            })
        } catch (error) {
            console.error('Remove failed:', error)
            alert('Could not remove image')
        }
    }

    return (
        <BlockEditorWrapper blockType="media">
            {/* Layout, Aspect Ratio & Image Fit - Three dropdowns in a row */}
            <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                    <Label className="text-xs">Layout</Label>
                    <Select 
                        value={content.layout || 'left'} 
                        onValueChange={(value) => onChange({ ...content, layout: value as 'left' | 'right' | 'full' })}
                    >
                        <SelectTrigger className="h-9">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {LAYOUT_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1.5">
                    <Label className="text-xs">Aspect Ratio</Label>
                    <Select 
                        value={content.aspectRatio || 'auto'} 
                        onValueChange={(value) => onChange({ ...content, aspectRatio: value as 'auto' | '16:9' | '4:3' | '1:1' | '3:2' })}
                    >
                        <SelectTrigger className="h-9">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {ASPECT_RATIO_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1.5">
                    <Label className="text-xs">Image Fit</Label>
                    <Select 
                        value={content.imageFit || 'cover'} 
                        onValueChange={(value) => onChange({ ...content, imageFit: value as 'cover' | 'contain' })}
                    >
                        <SelectTrigger className="h-9">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {IMAGE_FIT_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Image Upload */}
            <div className="space-y-2 pt-2">
                <Label>Image</Label>
                {content.imageUrl ? (
                    <div className="relative group">
                        <div className={cn(
                            "relative rounded-lg overflow-hidden bg-muted/20",
                            content.aspectRatio === '16:9' && "aspect-video",
                            content.aspectRatio === '4:3' && "aspect-[4/3]",
                            content.aspectRatio === '1:1' && "aspect-square",
                            content.aspectRatio === '3:2' && "aspect-[3/2]",
                            (!content.aspectRatio || content.aspectRatio === 'auto') && "max-h-[300px]"
                        )}>
                            <img
                                src={content.imageUrl}
                                alt="Media preview"
                                className={cn(
                                    "w-full rounded-lg",
                                    content.aspectRatio && content.aspectRatio !== 'auto' 
                                        ? "absolute inset-0 h-full" 
                                        : "h-auto max-h-[300px]",
                                    content.imageFit === 'contain' ? "object-contain" : "object-cover"
                                )}
                            />
                        </div>
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                            <label className="cursor-pointer">
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleImageUpload}
                                    disabled={uploading}
                                />
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    asChild
                                >
                                    <span>
                                        <Upload className="size-4 mr-2" />
                                        Replace
                                    </span>
                                </Button>
                            </label>
                            <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={handleRemoveImage}
                            >
                                <Trash2 className="size-4 mr-2" />
                                Remove
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="relative">
                        <input
                            type="file"
                            accept="image/*"
                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                            onChange={handleImageUpload}
                            disabled={uploading}
                        />
                        <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                            {uploading ? (
                                <div className="space-y-3">
                                    <Loader2 className="size-8 mx-auto text-primary animate-spin" />
                                    <Progress value={uploadProgress} className="h-1.5 max-w-xs mx-auto" />
                                    <p className="text-sm text-muted-foreground">Uploading...</p>
                                </div>
                            ) : (
                                <>
                                    <ImageIcon className="size-8 mx-auto text-muted-foreground mb-2" />
                                    <p className="text-sm font-medium">Click to upload image</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        PNG, JPG, GIF up to 10MB
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Title */}
            <div className="space-y-2 pt-4">
                <Label htmlFor="media-title">Title</Label>
                <Input
                    id="media-title"
                    placeholder="Enter title..."
                    value={content.title || ''}
                    onChange={(e) => onChange({ ...content, title: e.target.value })}
                />
            </div>

            {/* Description */}
            <div className="space-y-2 pt-2">
                <Label htmlFor="media-description">Description</Label>
                <Textarea
                    id="media-description"
                    placeholder="Enter description..."
                    value={content.description || ''}
                    onChange={(e) => onChange({ ...content, description: e.target.value })}
                    rows={3}
                />
            </div>
        </BlockEditorWrapper>
    )
}
