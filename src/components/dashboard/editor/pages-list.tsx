'use client'

import { useState } from 'react'
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
import { GripVertical, Trash2, FileText, Plus, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { CreatePageModal } from '@/components/dashboard/create-page-modal'
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

interface PagesListViewProps {
    projectId: string
    pages: Page[]
    onPageSelect: (pageId: string) => void
    onPageCreated: (page: Page) => void
    onPageDelete: (pageId: string) => void
    onPagesReorder: (pages: Page[]) => void
}

export function PagesListView({
    projectId,
    pages,
    onPageSelect,
    onPageCreated,
    onPageDelete,
    onPagesReorder
}: PagesListViewProps) {
    const [deleteId, setDeleteId] = useState<string | null>(null)

    const sortedPages = [...pages].sort((a, b) => a.sort_order - b.sort_order)

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event

        if (over && active.id !== over.id) {
            const oldIndex = sortedPages.findIndex((p) => p.id === active.id)
            const newIndex = sortedPages.findIndex((p) => p.id === over.id)
            const newPages = arrayMove(sortedPages, oldIndex, newIndex).map((p, i) => ({
                ...p,
                sort_order: i
            }))
            onPagesReorder(newPages)
        }
    }

    const handleDelete = () => {
        if (deleteId) {
            onPageDelete(deleteId)
            setDeleteId(null)
        }
    }

    return (
        <>
            {/* Header */}
            <div className="p-4 border-b bg-muted/30">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">Pages</h3>
                    <CreatePageModal projectId={projectId} onPageCreated={onPageCreated} />
                </div>
            </div>

            {/* Pages List */}
            <div className="flex-1 overflow-y-auto p-2">
                {sortedPages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <FileText className="size-10 text-muted-foreground/30 mb-3" />
                        <p className="text-sm font-medium text-muted-foreground">No pages yet</p>
                        <p className="text-xs text-muted-foreground mt-1">Create your first page to get started</p>
                    </div>
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={sortedPages.map((p) => p.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="space-y-1">
                                {sortedPages.map((page, index) => (
                                    <SortablePageItem
                                        key={page.id}
                                        page={page}
                                        pageNumber={index + 1}
                                        onSelect={() => onPageSelect(page.id)}
                                        onDelete={() => setDeleteId(page.id)}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                )}
            </div>

            {/* Delete Confirmation */}
            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete page?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will delete the page and all its content. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}

interface SortablePageItemProps {
    page: Page
    pageNumber: number
    onSelect: () => void
    onDelete: () => void
}

function SortablePageItem({ page, pageNumber, onSelect, onDelete }: SortablePageItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: page.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "group flex items-center gap-2 rounded-lg px-2 py-2.5 transition-colors cursor-pointer",
                "hover:bg-muted",
                isDragging && "opacity-50 z-50 bg-muted ring-1 ring-primary"
            )}
            onClick={onSelect}
        >
            <div className="relative w-6 h-6 flex items-center justify-center shrink-0">
                <span className="text-xs font-medium text-muted-foreground group-hover:opacity-0 transition-opacity">
                    {pageNumber}
                </span>
                <button
                    {...attributes}
                    {...listeners}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute inset-0 flex items-center justify-center cursor-grab active:cursor-grabbing rounded hover:bg-muted-foreground/10 text-muted-foreground transition-all opacity-0 group-hover:opacity-100"
                >
                    <GripVertical className="size-4" />
                </button>
            </div>

            <FileText className="size-4 text-muted-foreground shrink-0" />

            <span className="flex-1 text-sm font-medium truncate">
                {page.title}
            </span>

            <button
                onClick={(e) => {
                    e.stopPropagation()
                    onDelete()
                }}
                className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all opacity-0 group-hover:opacity-100"
            >
                <Trash2 className="size-4" />
            </button>

            <ChevronRight className="size-4 text-muted-foreground shrink-0" />
        </div>
    )
}

