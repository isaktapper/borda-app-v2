'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Plus, Trash2, ListChecks } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChecklistItem {
    id: string
    label: string
}

interface ChecklistBlockContent {
    title?: string
    items: ChecklistItem[]
}

interface ChecklistBlockEditorProps {
    content: ChecklistBlockContent
    onChange: (content: ChecklistBlockContent) => void
}

export function ChecklistBlockEditor({ content, onChange }: ChecklistBlockEditorProps) {
    const handleAddItem = () => {
        const id = Math.random().toString(36).substring(2, 10)
        const items = [...(content.items || []), { id, label: '' }]
        onChange({ ...content, items })
    }

    const handleUpdateItem = (index: number, label: string) => {
        const items = [...(content.items || [])]
        if (items[index]) {
            items[index] = { ...items[index], label }
            onChange({ ...content, items })
        }
    }

    const handleRemoveItem = (index: number) => {
        const items = (content.items || []).filter((_, i) => i !== index)
        onChange({ ...content, items })
    }

    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="title" className="text-xs uppercase tracking-widest text-muted-foreground">Rubrik (valfri)</Label>
                    <Input
                        id="title"
                        placeholder="t.ex. Innan kickoff"
                        value={content.title || ''}
                        onChange={(e) => onChange({ ...content, title: e.target.value })}
                        className="font-semibold text-lg border-none px-0 shadow-none focus-visible:ring-0 placeholder:opacity-50"
                    />
                </div>

                <div className="space-y-3 bg-muted/30 p-4 rounded-xl border border-dashed">
                    <Label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 block">Checklista</Label>

                    <div className="space-y-2">
                        {(content.items || []).map((item, index) => (
                            <div key={item.id} className="flex gap-2 items-start animate-in zoom-in-95 duration-200">
                                <div className="pt-2">
                                    <Checkbox disabled className="size-5 rounded-md" />
                                </div>
                                <Input
                                    placeholder="Skriv en punkt..."
                                    value={item.label}
                                    onChange={(e) => handleUpdateItem(index, e.target.value)}
                                    className="bg-background shadow-none border-transparent hover:border-input focus-visible:border-input transition-colors h-9"
                                />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRemoveItem(index)}
                                    disabled={(content.items || []).length <= 1}
                                    className="text-muted-foreground hover:text-destructive shrink-0 size-9"
                                >
                                    <Trash2 className="size-4" />
                                </Button>
                            </div>
                        ))}
                    </div>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleAddItem}
                        className="w-full mt-2 border border-dashed hover:border-solid hover:bg-background h-9 gap-2 text-xs text-muted-foreground"
                    >
                        <Plus className="size-3" />
                        Lägg till punkt
                    </Button>
                </div>
            </div>

            {/* Visual Preview */}
            <div className="pt-4 border-t border-dashed">
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3 block">Förhandsgranskning i kundportalen</Label>
                <div className="rounded-xl border bg-card p-6 opacity-70 grayscale-[0.3]">
                    <div className="space-y-4">
                        {content.title && <h4 className="font-semibold text-foreground/80">{content.title}</h4>}

                        <div className="space-y-3">
                            {(content.items || []).map((item) => (
                                <div key={item.id} className="flex items-center gap-3">
                                    <div className="size-5 border-2 rounded bg-muted/30" />
                                    <span className={cn(
                                        "text-sm",
                                        !item.label && "text-muted-foreground italic"
                                    )}>
                                        {item.label || 'Ny punkt...'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
