'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2, Loader2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface BlockItemProps {
    id: string
    onDelete: () => void
    children: React.ReactNode
}

export function BlockItem({ id, onDelete, children }: BlockItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id })

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
    }

    if (isDragging) {
        return (
            <div
                ref={setNodeRef}
                style={style}
                className="rounded-lg border-2 border-dashed border-primary/20 bg-primary/5 p-4 h-[100px]"
            />
        )
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "group relative flex items-start gap-3 rounded-lg border border-transparent p-4 transition-all duration-200",
                "hover:border-border hover:bg-accent/5"
            )}
        >
            {/* Left Controls */}
            <div className="flex flex-col items-center gap-2 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    {...attributes}
                    {...listeners}
                    className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted text-muted-foreground transition-colors"
                >
                    <GripVertical className="size-4" />
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 min-w-0">
                {children}
            </div>

            {/* Right Status / Actions */}
            <div className="flex flex-col items-end gap-2 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onDelete}
                    className="size-7 hover:text-destructive hover:bg-destructive/10 transition-all"
                >
                    <Trash2 className="size-4" />
                </Button>
            </div>
        </div>
    )
}
