'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Card } from '@/components/ui/card'
import { Upload, FileIcon, ImageIcon, FileTextIcon, TableIcon, ArchiveIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FileUploadBlockContent {
    label: string
    description?: string
    acceptedTypes: string[]
    maxFiles: number
}

interface FileUploadBlockEditorProps {
    content: FileUploadBlockContent
    onChange: (content: FileUploadBlockContent) => void
}

const FILE_TYPE_GROUPS = [
    {
        id: 'images',
        label: 'Bilder',
        icon: ImageIcon,
        types: ['image/png', 'image/jpeg', 'image/svg+xml', 'image/gif'],
        extensions: ['png', 'jpg', 'svg', 'gif']
    },
    {
        id: 'docs',
        label: 'Dokument',
        icon: FileTextIcon,
        types: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        extensions: ['pdf', 'doc', 'docx']
    },
    {
        id: 'spreadsheets',
        label: 'Kalkylark',
        icon: TableIcon,
        types: ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        extensions: ['csv', 'xls', 'xlsx']
    },
    {
        id: 'archives',
        label: 'Arkiv',
        icon: ArchiveIcon,
        types: ['application/zip'],
        extensions: ['zip']
    }
]

export function FileUploadBlockEditor({ content, onChange }: FileUploadBlockEditorProps) {
    const handleTypeToggle = (typeList: string[]) => {
        const currentTypes = content.acceptedTypes || []
        const hasAll = typeList.every(t => currentTypes.includes(t))

        let newTypes: string[]
        if (hasAll) {
            newTypes = currentTypes.filter(t => !typeList.includes(t))
        } else {
            newTypes = Array.from(new Set([...currentTypes, ...typeList]))
        }

        onChange({ ...content, acceptedTypes: newTypes })
    }

    return (
        <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="label">Rubrik / Vad ska laddas upp? <span className="text-destructive">*</span></Label>
                    <Input
                        id="label"
                        placeholder="t.ex. Logotyp, Avtal, Kvitto"
                        value={content.label || ''}
                        onChange={(e) => onChange({ ...content, label: e.target.value })}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="maxFiles">Max antal filer</Label>
                    <Input
                        id="maxFiles"
                        type="number"
                        min={1}
                        max={10}
                        value={content.maxFiles || 1}
                        onChange={(e) => onChange({ ...content, maxFiles: parseInt(e.target.value) || 1 })}
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                    id="description"
                    placeholder="e.g. Upload your logo in SVG or PNG format"
                    value={content.description || ''}
                    onChange={(e) => onChange({ ...content, description: e.target.value })}
                />
            </div>

            <div className="space-y-3">
                <Label>Allowed file types</Label>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {FILE_TYPE_GROUPS.map((group) => {
                        const Icon = group.icon
                        const isChecked = group.types.every(t => (content.acceptedTypes || []).includes(t))

                        return (
                            <Card
                                key={group.id}
                                className={cn(
                                    "p-3 flex items-start gap-3 cursor-pointer hover:bg-accent/50 transition-colors border-2",
                                    isChecked ? "border-primary/50 bg-primary/5" : "border-transparent"
                                )}
                                onClick={() => handleTypeToggle(group.types)}
                            >
                                <Checkbox
                                    checked={isChecked}
                                    onCheckedChange={() => handleTypeToggle(group.types)}
                                />
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Icon className="size-4 text-muted-foreground" />
                                        <span className="text-sm font-medium leading-none">{group.label}</span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                        {group.extensions.join(', ')}
                                    </p>
                                </div>
                            </Card>
                        )
                    })}
                </div>
            </div>

            {/* Visual Preview for Client */}
            <div className="pt-4 border-t border-dashed">
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3 block">Preview i kundportalen</Label>
                <div className="rounded-xl border-2 border-dashed bg-muted/30 p-8 flex flex-col items-center justify-center text-center opacity-70 grayscale-[0.5]">
                    <div className="p-4 rounded-full bg-background shadow-sm mb-4">
                        <Upload className="size-6 text-primary" />
                    </div>
                    <div className="space-y-1">
                        <h4 className="font-bold text-foreground/80">{content.label || 'Vad ska laddas upp?'}</h4>
                        {content.description && <p className="text-sm text-muted-foreground">{content.description}</p>}
                        <p className="text-[10px] text-muted-foreground/60 italic pt-2">
                            The customer uploads their files here in the portal.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
