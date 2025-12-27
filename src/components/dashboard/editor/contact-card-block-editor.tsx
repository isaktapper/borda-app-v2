'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Mail, Phone, User as UserIcon } from 'lucide-react'

interface ContactCardBlockContent {
    name: string
    title?: string
    email?: string
    phone?: string
    avatarUrl?: string
}

interface ContactCardBlockEditorProps {
    content: ContactCardBlockContent
    onChange: (content: ContactCardBlockContent) => void
}

export function ContactCardBlockEditor({ content, onChange }: ContactCardBlockEditorProps) {
    const getInitials = (name: string) => {
        if (!name) return '?'
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)
    }

    return (
        <div className="space-y-6">
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
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3 block">Förhandsgranskning</Label>
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
    )
}
