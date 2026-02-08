'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
    Download,
    Trash2,
    FileText,
    FileSpreadsheet,
    Image as ImageIcon,
    File,
    Loader2,
    Upload
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { sanitizeStoragePath, sanitizeFileExtension, isValidStoragePath } from '@/lib/storage-security'
import { BlockEditorWrapper } from './block-editor-wrapper'

interface DownloadFile {
    id: string
    name: string
    size: number
    type: string
    storagePath: string
}

interface FileDownloadBlockContent {
    title?: string
    description?: string
    files: DownloadFile[]
}

interface FileDownloadBlockEditorProps {
    blockId: string
    spaceId?: string
    content: FileDownloadBlockContent
    onChange: (content: FileDownloadBlockContent) => void
}

function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function getFileIcon(type: string) {
    if (type.includes('pdf')) return FileText
    if (type.includes('word') || type.includes('document')) return FileText
    if (type.includes('excel') || type.includes('spreadsheet') || type.includes('csv')) return FileSpreadsheet
    if (type.includes('image')) return ImageIcon
    return File
}

function getFileIconColor(type: string): string {
    if (type.includes('pdf')) return 'text-red-500'
    if (type.includes('word') || type.includes('document')) return 'text-blue-500'
    if (type.includes('excel') || type.includes('spreadsheet') || type.includes('csv')) return 'text-green-500'
    if (type.includes('image')) return 'text-purple-500'
    return 'text-muted-foreground'
}

export function FileDownloadBlockEditor({ blockId, spaceId, content, onChange }: FileDownloadBlockEditorProps) {
    const [uploading, setUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState(0)

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files || files.length === 0) return

        if (!spaceId || !blockId) {
            alert('The project must be saved before files can be uploaded')
            return
        }

        setUploading(true)
        setUploadProgress(0)

        try {
            const supabase = createClient()

            // Get project to find organizationId
            const { data: project, error: projectError } = await supabase
                .from('spaces')
                .select('organization_id')
                .eq('id', spaceId)
                .single()

            if (projectError || !project) {
                throw new Error('Kunde inte hitta projektet')
            }

            const newFiles: DownloadFile[] = []

            for (let i = 0; i < files.length; i++) {
                const file = files[i]
                setUploadProgress(((i + 0.5) / files.length) * 100)

                // Generate unique file path with sanitization
                const fileExt = sanitizeFileExtension(file.name.split('.').pop() || 'bin')
                const fileName = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_')
                const uniqueId = crypto.randomUUID()
                const storagePath = sanitizeStoragePath(`${project.organization_id}/${spaceId}/downloads/${blockId}/${uniqueId}-${fileName}.${fileExt}`)

                // Upload to Supabase Storage
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('project-files')
                    .upload(storagePath, file, {
                        cacheControl: '3600',
                        upsert: false
                    })

                if (uploadError) {
                    console.error('Upload error:', uploadError)
                    throw new Error(`Kunde inte ladda upp ${file.name}: ${uploadError.message}`)
                }

                newFiles.push({
                    id: uniqueId,
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    storagePath: uploadData.path
                })

                setUploadProgress(((i + 1) / files.length) * 100)
            }

            // Update block content with new files
            onChange({
                ...content,
                files: [...(content.files || []), ...newFiles]
            })

        } catch (error: any) {
            console.error('Upload failed:', error)
            alert(error.message || 'Kunde inte ladda upp filerna')
        } finally {
            setUploading(false)
            setUploadProgress(0)
            e.target.value = '' // Reset input
        }
    }

    const handleRemoveFile = async (fileId: string) => {
        const fileToRemove = content.files.find(f => f.id === fileId)
        if (!fileToRemove) return

        // Optimistically update UI
        onChange({
            ...content,
            files: content.files.filter(f => f.id !== fileId)
        })

        // Remove from storage in background (validate path first)
        try {
            if (!isValidStoragePath(fileToRemove.storagePath)) {
                console.error('Invalid storage path, skipping removal')
                return
            }
            const supabase = createClient()
            const { error } = await supabase.storage
                .from('project-files')
                .remove([fileToRemove.storagePath])

            if (error) {
                console.error('Failed to remove file from storage:', error)
                // File already removed from UI, so we don't need to rollback
            }
        } catch (error) {
            console.error('Error removing file:', error)
        }
    }

    return (
        <BlockEditorWrapper blockType="file_download">
            <div className="space-y-6">
                <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="title" className="text-xs uppercase tracking-widest text-muted-foreground">
                        Title (optional)
                    </Label>
                    <Input
                        id="title"
                        placeholder="t.ex. Projektdokumentation"
                        value={content.title || ''}
                        onChange={(e) => onChange({ ...content, title: e.target.value })}
                        className="font-semibold text-lg border-none px-0 shadow-none focus-visible:ring-0 placeholder:opacity-50"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="description">Description (optional)</Label>
                    <Textarea
                        id="description"
                        placeholder="e.g. Download the documents below to get started"
                        value={content.description || ''}
                        onChange={(e) => onChange({ ...content, description: e.target.value })}
                    />
                </div>
            </div>

            {/* Uploaded Files List */}
            {content.files && content.files.length > 0 && (
                <div className="space-y-3 bg-muted/30 p-4 rounded-xl border border-dashed">
                    <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        Uppladdade filer ({content.files.length})
                    </Label>
                    <div className="space-y-2">
                        {content.files.map((file) => {
                            const Icon = getFileIcon(file.type)
                            const iconColor = getFileIconColor(file.type)

                            return (
                                <div
                                    key={file.id}
                                    className="flex items-center gap-3 p-3 rounded-lg bg-background border hover:border-primary/20 transition-colors"
                                >
                                    <div className={cn("p-2 rounded-md bg-muted", iconColor)}>
                                        <Icon className="size-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{file.name}</p>
                                        <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleRemoveFile(file.id)}
                                        className="shrink-0 text-muted-foreground hover:text-destructive"
                                    >
                                        <Trash2 className="size-4" />
                                    </Button>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* File Upload */}
            <div className="space-y-3">
                <Label htmlFor="file-upload">Upload fileer</Label>
                <div className="relative">
                    <input
                        id="file-upload"
                        type="file"
                        multiple
                        onChange={handleFileSelect}
                        disabled={uploading}
                        className="hidden"
                    />
                    <label
                        htmlFor="file-upload"
                        className={cn(
                            "flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed cursor-pointer transition-colors",
                            uploading
                                ? "bg-muted/50 border-muted cursor-not-allowed"
                                : "hover:border-primary hover:bg-primary/5"
                        )}
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="size-8 text-primary animate-spin" />
                                <p className="text-sm text-muted-foreground">Laddar upp... {Math.round(uploadProgress)}%</p>
                                <div className="w-full max-w-xs h-2 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary transition-all duration-300"
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="p-3 rounded-full bg-primary/10">
                                    <Upload className="size-6 text-primary" />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-medium">Click to select files</p>
                                    <p className="text-xs text-muted-foreground mt-1">or drag and drop here</p>
                                </div>
                            </>
                        )}
                    </label>
                </div>
            </div>

            {/* Preview */}
            <div className="pt-4 border-t border-dashed">
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3 block">
                    Preview i kundportalen
                </Label>
                <div className="rounded-xl border bg-card p-6 opacity-70 grayscale-[0.3]">
                    <div className="space-y-4">
                        {content.title && (
                            <h4 className="font-bold text-foreground/80">{content.title}</h4>
                        )}
                        {content.description && (
                            <p className="text-sm text-muted-foreground">{content.description}</p>
                        )}
                        {content.files && content.files.length > 0 ? (
                            <div className="space-y-2 pt-2">
                                {content.files.slice(0, 3).map((file) => {
                                    const Icon = getFileIcon(file.type)
                                    const iconColor = getFileIconColor(file.type)

                                    return (
                                        <div
                                            key={file.id}
                                            className="flex items-center gap-3 p-3 rounded-lg bg-muted/30"
                                        >
                                            <div className={cn("p-2 rounded-md bg-background", iconColor)}>
                                                <Icon className="size-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">{file.name}</p>
                                                <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                                            </div>
                                            <Download className="size-4 text-muted-foreground" />
                                        </div>
                                    )
                                })}
                                {content.files.length > 3 && (
                                    <p className="text-xs text-muted-foreground text-center pt-2">
                                        +{content.files.length - 3} fler filer...
                                    </p>
                                )}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground/60 italic text-center py-4">
                                No files uploaded yet
                            </p>
                        )}
                    </div>
                </div>
            </div>
            </div>
        </BlockEditorWrapper>
    )
}
