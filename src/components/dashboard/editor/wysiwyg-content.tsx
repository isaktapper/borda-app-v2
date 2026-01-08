'use client'

import { Loader2, MoreHorizontal, Trash2, Sparkles, MousePointerClick, LayoutGrid } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EditorBlockPreview } from './editor-block-preview'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

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
}

export function WYSIWYGContent({
    blocks,
    selectedBlockId,
    isLoading,
    onBlockSelect,
    onBlockDelete
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
                    <WYSIWYGBlock
                        key={block.id}
                        block={block}
                        isSelected={selectedBlockId === block.id}
                        onSelect={() => onBlockSelect(block.id)}
                        onDelete={() => onBlockDelete(block.id)}
                    />
                ))}
            </div>
        </div>
    )
}

interface WYSIWYGBlockProps {
    block: Block
    isSelected: boolean
    onSelect: () => void
    onDelete: () => void
}

function WYSIWYGBlock({ block, isSelected, onSelect, onDelete }: WYSIWYGBlockProps) {
    return (
        <div
            className={cn(
                "group relative rounded-xl transition-all cursor-pointer",
                isSelected
                    ? "ring-2 ring-primary ring-offset-4 ring-offset-background"
                    : "hover:ring-1 hover:ring-border hover:ring-offset-2 hover:ring-offset-background"
            )}
            onClick={onSelect}
        >
            {/* Action button - top right */}
            <div className={cn(
                "absolute -right-2 -top-2 z-10 opacity-0 transition-opacity",
                "group-hover:opacity-100",
                isSelected && "opacity-100"
            )}>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button 
                            className="p-1.5 rounded-lg bg-background border shadow-sm hover:bg-muted text-muted-foreground transition-colors"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <MoreHorizontal className="size-4" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem
                            onClick={(e) => {
                                e.stopPropagation()
                                onDelete()
                            }}
                            className="text-destructive focus:text-destructive"
                        >
                            <Trash2 className="size-4 mr-2" />
                            Delete block
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Block Content - rendered as portal preview */}
            <div className="pointer-events-none">
                <EditorBlockPreview block={block} />
            </div>
        </div>
    )
}
