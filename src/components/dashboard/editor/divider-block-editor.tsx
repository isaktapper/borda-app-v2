'use client'

import { Label } from '@/components/ui/label'
import {
    Tabs,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"
import { Minus, MoveVertical } from 'lucide-react'
import { BlockEditorWrapper } from './block-editor-wrapper'

interface DividerBlockContent {
    style: 'line' | 'space'
}

interface DividerBlockEditorProps {
    content: DividerBlockContent
    onChange: (content: DividerBlockContent) => void
}

export function DividerBlockEditor({ content, onChange }: DividerBlockEditorProps) {
    return (
        <BlockEditorWrapper blockType="divider">
            <div className="space-y-6">
                <div className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                        <Label className="text-xs uppercase tracking-widest text-muted-foreground">Avskiljare</Label>
                        <p className="text-xs text-muted-foreground italic">Choose whether you want a line or just extra space.</p>
                    </div>

                    <Tabs
                        value={content.style || 'line'}
                        onValueChange={(val: any) => onChange({ ...content, style: val })}
                        className="w-auto"
                    >
                        <TabsList className="grid grid-cols-2 w-[240px] h-9 p-1 bg-muted/50">
                            <TabsTrigger value="line" className="gap-2 text-xs">
                                <Minus className="size-3" />
                                Linje
                            </TabsTrigger>
                            <TabsTrigger value="space" className="gap-2 text-xs">
                                <MoveVertical className="size-3" />
                                Mellanrum
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                <div className="pt-4 border-t border-dashed">
                    <Label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-6 block">Preview</Label>

                    <div className="rounded-xl border border-dashed bg-muted/5 p-8 flex flex-col items-center gap-4">
                        <div className="w-full h-4 bg-muted/20 rounded-sm opacity-50" />

                        {content.style === 'line' ? (
                            <div className="w-full py-2">
                                <hr className="border-t-2 border-border border-dashed" />
                            </div>
                        ) : (
                            <div className="w-full h-12 flex items-center justify-center">
                                <div className="flex flex-col items-center gap-1 opacity-20">
                                    <MoveVertical className="size-4" />
                                    <span className="text-[10px] font-bold uppercase tracking-tighter">Whitespace</span>
                                    <MoveVertical className="size-4" />
                                </div>
                            </div>
                        )}

                        <div className="w-full h-4 bg-muted/20 rounded-sm opacity-50" />
                    </div>
                </div>
            </div>
        </BlockEditorWrapper>
    )
}
