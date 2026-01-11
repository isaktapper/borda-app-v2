'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, Upload, X, Loader2, Link, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

export interface WelcomePopupContent {
    enabled: boolean
    title: string
    description: string
    imageUrl?: string | null
    videoUrl?: string | null
    ctaText?: string | null
    ctaAction?: 'dismiss' | 'go_to_page' | 'link'
    ctaPageId?: string | null
    ctaLink?: string | null
}

interface WelcomePopupEditorProps {
    spaceId: string
    content: WelcomePopupContent | null
    pages: { id: string; title: string }[]
    onSave: (content: WelcomePopupContent) => Promise<void>
    onBack: () => void
}

const DEFAULT_CONTENT: WelcomePopupContent = {
    enabled: false,
    title: '',
    description: '',
    imageUrl: null,
    videoUrl: null,
    ctaText: null,
    ctaAction: 'dismiss',
    ctaPageId: null,
    ctaLink: null,
}

export function WelcomePopupEditor({
    spaceId,
    content,
    pages,
    onSave,
    onBack,
}: WelcomePopupEditorProps) {
    const [formData, setFormData] = useState<WelcomePopupContent>(content || DEFAULT_CONTENT)
    const [isSaving, setIsSaving] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [hasChanges, setHasChanges] = useState(false)

    // Track changes
    useEffect(() => {
        const originalContent = content || DEFAULT_CONTENT
        const hasChanged = JSON.stringify(formData) !== JSON.stringify(originalContent)
        setHasChanges(hasChanged)
    }, [formData, content])

    const handleSave = async () => {
        setIsSaving(true)
        try {
            await onSave(formData)
            setHasChanges(false)
        } catch (error) {
            console.error('Failed to save welcome popup:', error)
        } finally {
            setIsSaving(false)
        }
    }

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsUploading(true)
        try {
            // Create form data and upload
            const formDataUpload = new FormData()
            formDataUpload.append('file', file)

            const response = await fetch(`/api/spaces/${spaceId}/welcome-image`, {
                method: 'POST',
                body: formDataUpload,
            })

            if (response.ok) {
                const data = await response.json()
                setFormData(prev => ({ ...prev, imageUrl: data.url, videoUrl: null }))
            }
        } catch (error) {
            console.error('Failed to upload image:', error)
        } finally {
            setIsUploading(false)
        }
    }

    const removeMedia = () => {
        setFormData(prev => ({ ...prev, imageUrl: null, videoUrl: null }))
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b">
                <div className="flex items-center justify-center relative">
                    {/* Back button */}
                    <button
                        onClick={onBack}
                        className="absolute left-0 p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ChevronLeft className="size-5" />
                    </button>

                    {/* Centered text */}
                    <div className="flex flex-col items-center text-center">
                        <span className="text-xs text-muted-foreground">Welcome Pop-Up</span>
                        <h3 className="font-semibold text-base">Edit Welcome Message</h3>
                    </div>
                </div>
            </div>

            {/* Editor content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Enable/Disable toggle */}
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border">
                    <div className="space-y-0.5">
                        <Label className="text-sm font-medium">Enable Welcome Pop-Up</Label>
                        <p className="text-xs text-muted-foreground">
                            Show this message when stakeholders first visit
                        </p>
                    </div>
                    <Switch
                        checked={formData.enabled}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, enabled: checked }))}
                    />
                </div>

                {/* Title */}
                <div className="space-y-2">
                    <Label htmlFor="welcome-title">Title</Label>
                    <Input
                        id="welcome-title"
                        placeholder="Welcome to your space!"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    />
                </div>

                {/* Description */}
                <div className="space-y-2">
                    <Label htmlFor="welcome-description">Description</Label>
                    <Textarea
                        id="welcome-description"
                        placeholder="We're excited to have you here. Here's what you can expect..."
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        rows={4}
                    />
                </div>

                {/* Image/Video */}
                <div className="space-y-2">
                    <Label>Image or Video (Optional)</Label>
                    {formData.imageUrl ? (
                        <div className="relative group">
                            <img
                                src={formData.imageUrl}
                                alt="Welcome popup"
                                className="w-full h-40 object-cover rounded-lg"
                            />
                            <button
                                onClick={removeMedia}
                                className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 hover:bg-background text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <X className="size-4" />
                            </button>
                        </div>
                    ) : formData.videoUrl ? (
                        <div className="relative group">
                            <div className="w-full h-40 bg-muted rounded-lg flex items-center justify-center">
                                <span className="text-sm text-muted-foreground">Video: {formData.videoUrl}</span>
                            </div>
                            <button
                                onClick={removeMedia}
                                className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 hover:bg-background text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <X className="size-4" />
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3">
                            {/* Image upload */}
                            <label className="cursor-pointer">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="hidden"
                                    disabled={isUploading}
                                />
                                <div className={cn(
                                    "flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg transition-colors",
                                    "hover:border-primary/50 hover:bg-primary/5",
                                    isUploading && "opacity-50"
                                )}>
                                    {isUploading ? (
                                        <Loader2 className="size-6 animate-spin text-muted-foreground" />
                                    ) : (
                                        <Upload className="size-6 text-muted-foreground" />
                                    )}
                                    <span className="text-xs text-muted-foreground">Upload Image</span>
                                </div>
                            </label>

                            {/* Video URL */}
                            <div className="flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg text-muted-foreground">
                                <span className="text-xs">Video URL coming soon</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* CTA Button */}
                <div className="space-y-4 p-4 bg-muted/20 rounded-xl">
                    <Label className="text-sm font-medium">Call-to-Action Button (Optional)</Label>
                    
                    <div className="space-y-3">
                        <Input
                            placeholder="Button text (e.g., Get Started)"
                            value={formData.ctaText || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, ctaText: e.target.value || null }))}
                        />

                        {formData.ctaText && (
                            <>
                                <Select
                                    value={formData.ctaAction || 'dismiss'}
                                    onValueChange={(value: 'dismiss' | 'go_to_page' | 'link') => 
                                        setFormData(prev => ({ ...prev, ctaAction: value, ctaPageId: null, ctaLink: null }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Button action" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="dismiss">Just close popup</SelectItem>
                                        <SelectItem value="go_to_page">Go to page</SelectItem>
                                        <SelectItem value="link">Open external link</SelectItem>
                                    </SelectContent>
                                </Select>

                                {formData.ctaAction === 'go_to_page' && (
                                    <Select
                                        value={formData.ctaPageId || ''}
                                        onValueChange={(value) => setFormData(prev => ({ ...prev, ctaPageId: value }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select page" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {pages.map((page) => (
                                                <SelectItem key={page.id} value={page.id}>
                                                    {page.title}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}

                                {formData.ctaAction === 'link' && (
                                    <Input
                                        type="url"
                                        placeholder="https://..."
                                        value={formData.ctaLink || ''}
                                        onChange={(e) => setFormData(prev => ({ ...prev, ctaLink: e.target.value || null }))}
                                    />
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Save button */}
            <div className="p-4 border-t bg-background">
                <Button
                    onClick={handleSave}
                    disabled={!hasChanges || isSaving}
                    className="w-full"
                >
                    {isSaving ? (
                        <>
                            <Loader2 className="size-4 mr-2 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        'Save Changes'
                    )}
                </Button>
            </div>
        </div>
    )
}
