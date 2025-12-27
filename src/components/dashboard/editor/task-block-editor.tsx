'use client'

import { format } from 'date-fns'
import { Calendar as CalendarIcon, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent } from '@/components/ui/card'

interface TaskBlockContent {
    title: string
    description?: string
    dueDate?: string
}

interface TaskBlockEditorProps {
    content: TaskBlockContent
    onChange: (updates: Partial<TaskBlockContent>) => void
}

export function TaskBlockEditor({ content, onChange }: TaskBlockEditorProps) {
    return (
        <Card className="w-full border shadow-sm bg-card overflow-hidden group/task">
            <CardContent className="p-0">
                <div className="flex items-start gap-4 p-5">
                    {/* Visual Checkbox (Disabled in editor) */}
                    <div className="pt-1">
                        <Checkbox disabled className="size-5 rounded-md border-muted-foreground/30" />
                    </div>

                    <div className="flex-1 space-y-4">
                        {/* Title */}
                        <div className="space-y-1">
                            <Input
                                value={content.title}
                                onChange={(e) => onChange({ title: e.target.value })}
                                placeholder="Uppgiftens namn..."
                                className="border-none p-0 h-auto text-lg font-semibold focus-visible:ring-0 placeholder:text-muted-foreground/50 bg-transparent"
                            />
                        </div>

                        {/* Description */}
                        <div className="space-y-1">
                            <Textarea
                                value={content.description || ''}
                                onChange={(e) => onChange({ description: e.target.value })}
                                placeholder="Lägg till en beskrivning (frivilligt)..."
                                className="border-none p-0 min-h-[40px] resize-none focus-visible:ring-0 text-sm text-muted-foreground placeholder:text-muted-foreground/40 bg-transparent"
                                onInput={(e: React.FormEvent<HTMLTextAreaElement>) => {
                                    const target = e.currentTarget
                                    target.style.height = 'auto'
                                    target.style.height = (target.scrollHeight) + 'px'
                                }}
                            />
                        </div>

                        {/* Meta: Due Date */}
                        <div className="flex items-center gap-4 pt-2 border-t border-muted/50">
                            <div className="flex items-center gap-2">
                                <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/70">Deadline</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className={cn(
                                                "h-8 px-3 text-xs gap-2 rounded-full border-dashed hover:border-primary hover:text-primary transition-all",
                                                !content.dueDate && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="size-3" />
                                            {content.dueDate ? (
                                                format(new Date(content.dueDate), "PPP")
                                            ) : (
                                                <span>Välj datum</span>
                                            )}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={content.dueDate ? new Date(content.dueDate) : undefined}
                                            onSelect={(date) => onChange({ dueDate: date?.toISOString() })}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {content.dueDate && (
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Clock className="size-3" />
                                    <span>Skapad {format(new Date(), "MMM d")}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
