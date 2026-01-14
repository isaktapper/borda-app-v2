'use client'

import { Loader2, MousePointerClick, LayoutGrid } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EditorBlockPreview } from './editor-block-preview'

interface Block {
    id: string
    type: string
    content: any
    sort_order: number
}

interface WYSIWYGContentProps {
    blocks: Block[]
    selectedBlockId: string | null
    isLoading: boolean
    onBlockSelect: (blockId: string) => void
    onBlockDelete: (blockId: string) => void
    allBlocksFromAllPages?: Block[]  // For template mode: all blocks from all pages
}

export function WYSIWYGContent({
    blocks,
    selectedBlockId,
    isLoading,
    allBlocksFromAllPages
}: WYSIWYGContentProps) {
    // Sort and filter hidden blocks
    const visibleBlocks = blocks
        .filter(b => !b.content.hidden)
        .sort((a, b) => a.sort_order - b.sort_order)

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <Loader2 className="size-8 animate-spin text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">Loading content...</p>
            </div>
        )
    }

    if (visibleBlocks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full px-6">
                <div className="max-w-md text-center space-y-6">
                    {/* Decorative illustration */}
                    <div className="relative mx-auto w-32 h-32">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-3xl rotate-6" />
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent rounded-3xl -rotate-3" />
                        <div className="relative h-full flex items-center justify-center">
                            <LayoutGrid className="size-12 text-primary/60" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-xl font-semibold text-foreground">
                            This page is empty
                        </h3>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                            Add your first content block from the sidebar to start building this page.
                            Choose from text, tasks, forms, file uploads, and more.
                        </p>
                    </div>

                    {/* Hint */}
                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/70">
                        <MousePointerClick className="size-3.5" />
                        <span>Click "Add block" in the sidebar to get started</span>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto py-8 px-6">
            <div className="space-y-4">
                {visibleBlocks.map((block) => (
                    <div
                        key={block.id}
                        className={cn(
                            "rounded-xl transition-all",
                            selectedBlockId === block.id && "ring-2 ring-primary/50 ring-offset-4 ring-offset-background"
                        )}
                    >
                        <EditorBlockPreview block={block} allBlocks={allBlocksFromAllPages || blocks} />
                    </div>
                ))}
            </div>
        </div>
    )
}
