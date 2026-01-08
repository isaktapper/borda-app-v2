'use client'

import { useState, useTransition, useEffect } from 'react'
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { CreatePageModal } from './create-page-modal'
import { deletePage, reorderPages } from '@/app/(app)/spaces/[spaceId]/pages-actions'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface Page {
    id: string
    title: string
    slug: string
    sort_order: number
}

interface PagesSidebarProps {
    spaceId: string
    pages: Page[]
    selectedPageId?: string
    onSelect: (id: string) => void
    onOrderChange: (newPages: Page[]) => void
    onPageDelete: (id: string) => Promise<void>
    onPageCreated?: (newPage: Page) => void
}

export function PagesSidebar({ spaceId, pages, selectedPageId, onSelect, onOrderChange, onPageDelete, onPageCreated }: PagesSidebarProps) {
    const [deleteId, setDeleteId] = useState<string | null>(null)

    // Sync state with props when server-side data changes (e.g. after revalidatePath)
    // useEffect(() => {
    //     setPages(initialPages)
    // }, [initialPages])
    // Removed local state 'pages' and useEffect to let parent manage the list for manual save

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event

        if (over && active.id !== over.id) {
            const oldIndex = pages.findIndex((i) => i.id === active.id)
            const newIndex = pages.findIndex((i) => i.id === over.id)
            const newItems = arrayMove(pages, oldIndex, newIndex)
            onOrderChange(newItems)
        }
    }

    const handleDelete = async () => {
        if (!deleteId) return
        await onPageDelete(deleteId)
        setDeleteId(null)
    }

    return (
        <div className="w-64 border-r bg-muted/30 flex flex-col h-full overflow-hidden">
            <div className="p-4 flex items-center justify-between border-b bg-background/50">
                <h3 className="font-semibold text-sm">Pages</h3>
                <CreatePageModal spaceId={spaceId} onPageCreated={onPageCreated} />
            </div>

            <div className="flex-1 overflow-y-auto p-2">
                {pages.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic p-4 text-center">No pages yet.</p>
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={pages.map((p) => p.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="space-y-1">
                                {pages.map((page) => (
                                    <SortableItem
                                        key={page.id}
                                        id={page.id}
                                        title={page.title}
                                        isActive={selectedPageId === page.id}
                                        onClick={() => onSelect(page.id)}
                                        onDelete={() => setDeleteId(page.id)}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                )}
            </div>

            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will delete the page and all its content. This action is irreversible.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

interface SortableItemProps {
    id: string
    title: string
    isActive: boolean
    onClick: () => void
    onDelete: () => void
}

function SortableItem({ id, title, isActive, onClick, onDelete }: SortableItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                isActive ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted",
                isDragging && "opacity-50 z-50 bg-muted ring-1 ring-primary"
            )}
        >
            <button
                {...attributes}
                {...listeners}
                className={cn(
                    "cursor-grab active:cursor-grabbing p-0.5 rounded hover:bg-black/10 transition-colors",
                    isActive ? "text-primary-foreground/50" : "text-muted-foreground"
                )}
            >
                <GripVertical className="size-3.5" />
            </button>

            <button
                onClick={onClick}
                className="flex-1 text-left truncate font-medium"
            >
                {title}
            </button>

            <button
                onClick={(e) => {
                    e.stopPropagation()
                    onDelete()
                }}
                className={cn(
                    "opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive hover:text-destructive-foreground transition-all",
                    isActive ? "text-primary-foreground/50 hover:bg-white/20 hover:text-white" : "text-muted-foreground"
                )}
            >
                <Trash2 className="size-3.5" />
            </button>
        </div>
    )
}
