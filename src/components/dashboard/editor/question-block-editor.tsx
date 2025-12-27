'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2, HelpCircle, List, AlignLeft, Type, Calendar, CheckSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuestionBlockContent {
    question: string
    type: 'text' | 'textarea' | 'select' | 'multiselect' | 'date'
    options?: string[]
    required: boolean
}

interface QuestionBlockEditorProps {
    content: QuestionBlockContent
    onChange: (content: QuestionBlockContent) => void
}

const QUESTION_TYPES = [
    { id: 'text', label: 'Kort textsvar', icon: Type },
    { id: 'textarea', label: 'Långt textsvar', icon: AlignLeft },
    { id: 'select', label: 'Envalsfråga (dropdown)', icon: List },
    { id: 'multiselect', label: 'Flervalsfråga (checkboxes)', icon: CheckSquare },
    { id: 'date', label: 'Datumväljare', icon: Calendar },
]

export function QuestionBlockEditor({ content, onChange }: QuestionBlockEditorProps) {
    const handleAddOption = () => {
        const options = [...(content.options || []), '']
        onChange({ ...content, options })
    }

    const handleUpdateOption = (index: number, value: string) => {
        const options = [...(content.options || [])]
        options[index] = value
        onChange({ ...content, options })
    }

    const handleRemoveOption = (index: number) => {
        const options = (content.options || []).filter((_, i) => i !== index)
        onChange({ ...content, options })
    }

    const showOptionsEditor = content.type === 'select' || content.type === 'multiselect'

    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="question">Fråga <span className="text-destructive">*</span></Label>
                    <Input
                        id="question"
                        placeholder="t.ex. Vilket ekonomisystem använder ni?"
                        value={content.question || ''}
                        onChange={(e) => onChange({ ...content, question: e.target.value })}
                    />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label>Svarstyp</Label>
                        <Select
                            value={content.type || 'text'}
                            onValueChange={(val: any) => {
                                const updates: any = { type: val }
                                if ((val === 'select' || val === 'multiselect') && (!content.options || content.options.length === 0)) {
                                    updates.options = ['Alternativ 1', 'Alternativ 2']
                                }
                                onChange({ ...content, ...updates })
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Välj typ" />
                            </SelectTrigger>
                            <SelectContent>
                                {QUESTION_TYPES.map((t) => (
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

                    <div className="flex items-end pb-2">
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="required"
                                checked={content.required || false}
                                onCheckedChange={(checked) => onChange({ ...content, required: checked === true })}
                            />
                            <Label
                                htmlFor="required"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                                Obligatorisk fråga
                            </Label>
                        </div>
                    </div>
                </div>
            </div>

            {showOptionsEditor && (
                <div className="space-y-3 bg-muted/30 p-4 rounded-xl border border-dashed animate-in fade-in slide-in-from-top-1">
                    <div className="flex items-center justify-between mb-2">
                        <Label className="text-xs uppercase tracking-widest text-muted-foreground">Svarsalternativ</Label>
                    </div>

                    <div className="space-y-2">
                        {(content.options || []).map((option, index) => (
                            <div key={index} className="flex gap-2 animate-in zoom-in-95 duration-200">
                                <Input
                                    placeholder={`Alternativ ${index + 1}`}
                                    value={option}
                                    onChange={(e) => handleUpdateOption(index, e.target.value)}
                                    className="bg-background shadow-none"
                                />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRemoveOption(index)}
                                    disabled={(content.options || []).length <= 2}
                                    className="text-muted-foreground hover:text-destructive shrink-0"
                                >
                                    <Trash2 className="size-4" />
                                </Button>
                            </div>
                        ))}
                    </div>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleAddOption}
                        className="w-full mt-2 border border-dashed hover:border-solid hover:bg-background h-9 gap-2 text-xs text-muted-foreground"
                    >
                        <Plus className="size-3" />
                        Lägg till alternativ
                    </Button>
                </div>
            )}

            {/* Visual Preview */}
            <div className="pt-4 border-t border-dashed">
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3 block">Förhandsgranskning i kundportalen</Label>
                <div className="rounded-xl border bg-card p-6 opacity-70 grayscale-[0.3]">
                    <div className="space-y-3">
                        <div className="flex items-start gap-2">
                            <h4 className="font-semibold text-foreground/80 flex-1">
                                {content.question || 'Ställ en fråga här...'}
                                {content.required && <span className="text-destructive ml-1">*</span>}
                            </h4>
                        </div>

                        <div className="pt-1">
                            {content.type === 'text' && <Input disabled placeholder="Kunden svarar här..." className="bg-muted/30" />}
                            {content.type === 'textarea' && <Textarea disabled placeholder="Kunden skriver sitt svar här..." className="bg-muted/30 min-h-[80px]" />}
                            {content.type === 'date' && (
                                <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-muted/30 text-muted-foreground text-sm">
                                    <Calendar className="size-4" />
                                    <span>Välj ett datum...</span>
                                </div>
                            )}
                            {content.type === 'select' && (
                                <div className="space-y-1.5 pointer-events-none">
                                    <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-muted/30 text-muted-foreground text-sm flex-row justify-between">
                                        <span>Välj ett alternativ...</span>
                                        <Plus className="size-4 opacity-50 rotate-45" />
                                    </div>
                                </div>
                            )}
                            {content.type === 'multiselect' && (
                                <div className="space-y-2.5 pt-1">
                                    {(content.options || ['Alternativ 1', 'Alternativ 2']).map((opt, i) => (
                                        <div key={i} className="flex items-center gap-3 opacity-60">
                                            <div className="size-4 border rounded bg-muted/30" />
                                            <span className="text-sm">{opt || `Alternativ ${i + 1}`}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
