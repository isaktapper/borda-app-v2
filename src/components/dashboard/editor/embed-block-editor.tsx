'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Video, Calendar, Globe, ExternalLink } from 'lucide-react'
import { useState, useEffect } from 'react'

interface EmbedBlockContent {
    url: string
    type: 'video' | 'calendar' | 'generic'
}

interface EmbedBlockEditorProps {
    content: EmbedBlockContent
    onChange: (content: EmbedBlockContent) => void
}

const EMBED_TYPES = [
    { id: 'video', label: 'Video (Loom, YouTube, Vimeo)', icon: Video },
    { id: 'calendar', label: 'Kalender (Calendly, Cal.com)', icon: Calendar },
    { id: 'generic', label: 'Annan länk (iframe)', icon: Globe },
]

export function EmbedBlockEditor({ content, onChange }: EmbedBlockEditorProps) {
    const [isValidUrl, setIsValidUrl] = useState(true)

    useEffect(() => {
        if (!content.url) {
            setIsValidUrl(true)
            return
        }
        try {
            new URL(content.url)
            setIsValidUrl(true)
        } catch {
            setIsValidUrl(false)
        }
    }, [content.url])

    const getEmbedUrl = (url: string) => {
        if (!url) return ''

        // Simple Loom transform
        if (url.includes('loom.com/share/')) {
            return url.replace('loom.com/share/', 'loom.com/embed/')
        }
        // Simple YouTube transform
        if (url.includes('youtube.com/watch?v=')) {
            const id = new URL(url).searchParams.get('v')
            return `https://www.youtube.com/embed/${id}`
        }
        if (url.includes('youtu.be/')) {
            const id = url.split('/').pop()
            return `https://www.youtube.com/embed/${id}`
        }

        return url
    }

    const embedUrl = getEmbedUrl(content.url)

    return (
        <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label>Innehållstyp</Label>
                    <Select
                        value={content.type || 'generic'}
                        onValueChange={(val: any) => onChange({ ...content, type: val })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Välj typ" />
                        </SelectTrigger>
                        <SelectContent>
                            {EMBED_TYPES.map((t) => (
                                <SelectItem key={t.id} value={t.id}>
                                    <div className="flex items-center gap-2">
                                        <t.icon className="size-4 text-muted-foreground" />
                                        {t.label}
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="url">URL</Label>
                    <div className="relative">
                        <Input
                            id="url"
                            placeholder="https://..."
                            value={content.url || ''}
                            onChange={(e) => onChange({ ...content, url: e.target.value })}
                            className={!isValidUrl ? "border-destructive focus-visible:ring-destructive" : ""}
                        />
                        {content.url && isValidUrl && (
                            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                <ExternalLink className="size-3 text-muted-foreground" />
                            </div>
                        )}
                    </div>
                    {!isValidUrl && (
                        <p className="text-[10px] text-destructive font-medium uppercase tracking-wider">Ogiltig länk</p>
                    )}
                </div>
            </div>

            <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3 block">Förhandsgranskning</Label>
                <div className="aspect-video w-full rounded-xl border-2 border-dashed bg-muted/20 overflow-hidden flex items-center justify-center relative min-h-[200px] max-h-[400px]">
                    {content.url && isValidUrl ? (
                        <iframe
                            src={embedUrl}
                            className="absolute inset-0 w-full h-full border-0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            title="Embedded content"
                        />
                    ) : (
                        <div className="flex flex-col items-center gap-2 text-muted-foreground/40 p-12 text-center">
                            <ExternalLink className="size-8" />
                            <p className="text-sm font-medium">Ange en URL ovan för att förhandsgranska</p>
                            <p className="text-xs italic underline underline-offset-4 decoration-dotted">Tips: Loom-delningslänkar fungerar direkt!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
