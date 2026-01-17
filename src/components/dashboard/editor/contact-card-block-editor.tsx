'use client'

import { useState, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Mail, Phone, User as UserIcon, Upload, Loader2, Trash2, Camera } from 'lucide-react'
import { BlockEditorWrapper } from './block-editor-wrapper'
import { createClient } from '@/lib/supabase/client'
import { sanitizeStoragePath, sanitizeFileExtension, isValidStoragePath } from '@/lib/storage-security'
import { cn } from '@/lib/utils'

interface ContactCardBlockContent {
    name: string
    title?: string
    email?: string
    phone?: string
    avatarUrl?: string
    avatarStoragePath?: string
}

interface ContactCardBlockEditorProps {
    blockId: string
    spaceId?: string
    content: ContactCardBlockContent
    onChange: (content: ContactCardBlockContent) => void
}

export function ContactCardBlockEditor({ blockId, spaceId, content, onChange }: ContactCardBlockEditorProps) {
    const [uploading, setUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const getInitials = (name: string) => {
        if (!name) return '?'
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)
    }

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Validate it's an image
        if (!file.type.startsWith('image/')) {
            alert('Vänligen välj en bildfil')
            return
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('Bilden får max vara 5MB')
            return
        }

        if (!spaceId || !blockId) {
            alert('Projektet måste sparas innan bilder kan laddas upp')
            return
        }

        setUploading(true)

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

            // Remove old avatar if exists
            if (content.avatarStoragePath && isValidStoragePath(content.avatarStoragePath)) {
                await supabase.storage
                    .from('project-files')
                    .remove([content.avatarStoragePath])
            }

            // Generate unique file path
            const fileExt = sanitizeFileExtension(file.name.split('.').pop() || 'jpg')
            const uniqueId = crypto.randomUUID()
            const storagePath = sanitizeStoragePath(
                `${project.organization_id}/${spaceId}/contact-avatars/${blockId}/${uniqueId}.${fileExt}`
            )

            // Upload to Supabase Storage
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('project-files')
                .upload(storagePath, file, {
                    cacheControl: '3600',
                    upsert: false
                })

            if (uploadError) {
                throw new Error(uploadError.message)
            }

            // Create signed URL for display (valid for 7 days, like MediaBlock)
            const { data: signedData, error: signedError } = await supabase.storage
                .from('project-files')
                .createSignedUrl(uploadData.path, 60 * 60 * 24 * 7) // 7 days

            if (signedError) {
                console.error('Signed URL error:', signedError)
                throw new Error('Kunde inte skapa bild-URL')
            }

            onChange({
                ...content,
                avatarUrl: signedData.signedUrl,
                avatarStoragePath: uploadData.path
            })
        } catch (error: any) {
            console.error('Upload failed:', error)
            alert(error.message || 'Kunde inte ladda upp bilden')
        } finally {
            setUploading(false)
            if (fileInputRef.current) {
                fileInputRef.current.value = ''
            }
        }
    }

    const handleRemoveAvatar = async () => {
        if (content.avatarStoragePath && isValidStoragePath(content.avatarStoragePath)) {
            try {
                const supabase = createClient()
                await supabase.storage
                    .from('project-files')
                    .remove([content.avatarStoragePath])
            } catch (error) {
                console.error('Failed to remove old avatar:', error)
            }
        }

        onChange({
            ...content,
            avatarUrl: undefined,
            avatarStoragePath: undefined
        })
    }

    return (
        <BlockEditorWrapper blockType="contact">
            <div className="space-y-6">
                {/* Avatar Upload Section */}
                <div className="space-y-2">
                    <Label>Profilbild</Label>
                    <div className="flex items-center gap-4">
                        <div className="relative group">
                            <Avatar className="size-20 border-2 border-background shadow-lg">
                                <AvatarImage src={content.avatarUrl} alt={content.name} />
                                <AvatarFallback className="bg-primary/5 text-primary text-xl font-bold tracking-tighter">
                                    {getInitials(content.name)}
                                </AvatarFallback>
                            </Avatar>
                            
                            {/* Upload overlay */}
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className={cn(
                                    "absolute inset-0 flex items-center justify-center rounded-full transition-all",
                                    "bg-black/0 group-hover:bg-black/50",
                                    uploading && "bg-black/50"
                                )}
                            >
                                {uploading ? (
                                    <Loader2 className="size-6 text-white animate-spin" />
                                ) : (
                                    <Camera className="size-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                )}
                            </button>
                        </div>

                        <div className="flex flex-col gap-2">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleAvatarUpload}
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50"
                            >
                                <Upload className="size-4" />
                                {content.avatarUrl ? 'Byt bild' : 'Ladda upp'}
                            </button>
                            {content.avatarUrl && (
                                <button
                                    type="button"
                                    onClick={handleRemoveAvatar}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md text-destructive hover:bg-destructive/10 transition-colors"
                                >
                                    <Trash2 className="size-4" />
                                    Ta bort
                                </button>
                            )}
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground">Max 5MB. JPG, PNG eller GIF.</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Namn <span className="text-destructive">*</span></Label>
                        <Input
                            id="name"
                            placeholder="t.ex. Anna Andersson"
                            value={content.name || ''}
                            onChange={(e) => onChange({ ...content, name: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="title">Titel</Label>
                        <Input
                            id="title"
                            placeholder="t.ex. Implementation Manager"
                            value={content.title || ''}
                            onChange={(e) => onChange({ ...content, title: e.target.value })}
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">E-post</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="anna@foretag.se"
                            value={content.email || ''}
                            onChange={(e) => onChange({ ...content, email: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="phone">Telefon</Label>
                        <Input
                            id="phone"
                            placeholder="+46 70 000 00 00"
                            value={content.phone || ''}
                            onChange={(e) => onChange({ ...content, phone: e.target.value })}
                        />
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3 block">Preview</Label>
                <Card className="p-6 border-2 border-dashed bg-muted/10 shadow-none hover:bg-muted/20 transition-colors">
                    <div className="flex items-center gap-6">
                        <Avatar className="size-20 border-2 border-background shadow-lg">
                            <AvatarImage src={content.avatarUrl} alt={content.name} />
                            <AvatarFallback className="bg-primary/5 text-primary text-xl font-bold tracking-tighter">
                                {getInitials(content.name)}
                            </AvatarFallback>
                        </Avatar>

                        <div className="space-y-1.5 flex-1 min-w-0">
                            <div>
                                <h4 className="text-xl font-bold tracking-tight text-foreground truncate">
                                    {content.name || 'Ange ett namn...'}
                                </h4>
                                {content.title && (
                                    <p className="text-sm font-medium text-muted-foreground/80 leading-none">
                                        {content.title}
                                    </p>
                                )}
                            </div>

                            <div className="pt-2 flex flex-wrap gap-x-4 gap-y-2">
                                {content.email && (
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
                                        <Mail className="size-3" />
                                        <span>{content.email}</span>
                                    </div>
                                )}
                                {content.phone && (
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
                                        <Phone className="size-3" />
                                        <span>{content.phone}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="hidden sm:block p-3 rounded-full bg-background border shadow-sm">
                            <UserIcon className="size-5 text-muted-foreground/30" />
                        </div>
                    </div>
                </Card>
            </div>
            </div>
        </BlockEditorWrapper>
    )
}
