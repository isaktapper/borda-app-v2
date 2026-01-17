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
import { Trash2, FileText, Plus, Sparkles, MoreVertical, Info, ChevronRight, Check, X, Pencil } from 'lucide-react'
import { WelcomePopupEditor, WelcomePopupContent } from './welcome-popup-editor'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { CreatePageModal } from '@/components/dashboard/create-page-modal'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip'
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

interface PagesTabContentProps {
    spaceId: string
    pages: Page[]
    onPageSelect: (pageId: string) => void
    onPageCreated: (page: Page) => void
    onPageDelete: (pageId: string) => void
    onPageRename: (pageId: string, newTitle: string) => void
    onPagesReorder: (pages: Page[]) => void
    welcomePopup?: WelcomePopupContent | null
    onWelcomePopupSave?: (content: WelcomePopupContent) => Promise<void>
    isTemplateMode?: boolean
}

// Helper to generate slug from title
function generateSlug(title: string): string {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'untitled'
}

export function PagesTabContent({
    spaceId,
    pages,
    onPageSelect,
    onPageCreated,
    onPageDelete,
    onPageRename,
    onPagesReorder,
    welcomePopup,
    onWelcomePopupSave,
    isTemplateMode = false,
}: PagesTabContentProps) {
    const [deleteId, setDeleteId] = useState<string | null>(null)
    const [showWelcomeEditor, setShowWelcomeEditor] = useState(false)
    const [showCreatePageInput, setShowCreatePageInput] = useState(false)
    const [newPageTitle, setNewPageTitle] = useState('')

    // Handle local page creation for template mode
    const handleCreateLocalPage = () => {
        if (!newPageTitle.trim()) return
        
        const newPage: Page = {
            id: `page-${Date.now()}`,
            title: newPageTitle.trim(),
            slug: generateSlug(newPageTitle.trim()),
            sort_order: pages.length
        }
        
        onPageCreated(newPage)
        setNewPageTitle('')
        setShowCreatePageInput(false)
        onPageSelect(newPage.id)
    }

    // All hooks must be called before any conditional returns
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // 8px movement required before drag starts
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    const sortedPages = [...pages].sort((a, b) => a.sort_order - b.sort_order)

    // If showing welcome popup editor, render it instead
    if (showWelcomeEditor && onWelcomePopupSave) {
        return (
            <WelcomePopupEditor
                spaceId={spaceId}
                content={welcomePopup || null}
                pages={pages.map(p => ({ id: p.id, title: p.title }))}
                onSave={async (content) => {
                    await onWelcomePopupSave(content)
                    setShowWelcomeEditor(false)
                }}
                onBack={() => setShowWelcomeEditor(false)}
            />
        )
    }

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
            <div className="p-4 border-b">
                <div className="flex items-center justify-center relative">
                    <h3 className="font-semibold text-base">Pages overview</h3>
                    {isTemplateMode ? (
                        <Button 
                            size="icon" 
                            className="size-8 rounded-lg absolute right-0"
                            onClick={() => setShowCreatePageInput(true)}
                        >
                            <Plus className="size-4" />
                        </Button>
                    ) : (
                    <CreatePageModal 
                        spaceId={spaceId} 
                        onPageCreated={onPageCreated}
                        trigger={
                            <Button size="icon" className="size-8 rounded-lg absolute right-0">
                                <Plus className="size-4" />
                            </Button>
                        }
                    />
                    )}
                </div>
                
                {/* Inline page creation for template mode */}
                {isTemplateMode && showCreatePageInput && (
                    <div className="flex items-center gap-2 mt-3">
                        <Input
                            placeholder="Page title..."
                            value={newPageTitle}
                            onChange={(e) => setNewPageTitle(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleCreateLocalPage()
                                if (e.key === 'Escape') {
                                    setShowCreatePageInput(false)
                                    setNewPageTitle('')
                                }
                            }}
                            autoFocus
                            className="flex-1 h-8 text-sm"
                        />
                        <Button 
                            size="icon" 
                            className="size-8 shrink-0"
                            onClick={handleCreateLocalPage}
                            disabled={!newPageTitle.trim()}
                        >
                            <Check className="size-4" />
                        </Button>
                        <Button 
                            size="icon" 
                            variant="ghost"
                            className="size-8 shrink-0"
                            onClick={() => {
                                setShowCreatePageInput(false)
                                setNewPageTitle('')
                            }}
                        >
                            <X className="size-4" />
                        </Button>
                    </div>
                )}
            </div>

            {/* Welcome Pop-Up Section - not shown in template mode */}
            {!isTemplateMode && (
            <div className="px-4 pt-4">
                <button
                    onClick={() => setShowWelcomeEditor(true)}
                    className="w-full flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border/50 hover:bg-muted/50 hover:border-primary/30 transition-all cursor-pointer group"
                >
                    <div className="flex items-center gap-3">
                        <span className="text-base">👋</span>
                        <span className="text-sm font-medium text-foreground">Welcome Pop-Up</span>
                        <Tooltip>
                            <TooltipTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <span className="text-muted-foreground hover:text-foreground transition-colors">
                                    <Info className="size-4" />
                                </span>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-[200px]">
                                <p className="text-xs">Show a welcome message when stakeholders first visit your space.</p>
                            </TooltipContent>
                        </Tooltip>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={cn(
                            "text-xs px-2 py-0.5 rounded-full",
                            welcomePopup?.enabled 
                                ? "bg-emerald-100 text-emerald-700" 
                                : "bg-muted text-muted-foreground"
                        )}>
                            {welcomePopup?.enabled ? 'Active' : 'Inactive'}
                        </span>
                        <ChevronRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                </button>
            </div>
            )}

            {/* Pages List */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
                {sortedPages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                        {/* Decorative illustration */}
                        <div className="relative mb-4">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                                <FileText className="size-7 text-primary/60" />
                            </div>
                            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                                <Sparkles className="size-2.5 text-primary" />
                            </div>
                        </div>

                        <h4 className="font-semibold text-sm text-foreground mb-1">
                            No pages yet
                        </h4>
                        <p className="text-xs text-muted-foreground mb-4 max-w-[280px]">
                            Pages help you organize your content into logical sections for your client.
                        </p>

                        {isTemplateMode ? (
                            <Button 
                                size="sm" 
                                className="gap-1.5"
                                onClick={() => setShowCreatePageInput(true)}
                            >
                                <Plus className="size-3.5" />
                                Create first page
                            </Button>
                        ) : (
                        <CreatePageModal
                            spaceId={spaceId}
                            onPageCreated={onPageCreated}
                            trigger={
                                <Button size="sm" className="gap-1.5">
                                    <Plus className="size-3.5" />
                                    Create first page
                                </Button>
                            }
                        />
                        )}
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
                            <div className="space-y-3">
                                {sortedPages.map((page) => (
                                    <SortablePageItem
                                        key={page.id}
                                        page={page}
                                        onSelect={() => onPageSelect(page.id)}
                                        onDelete={() => setDeleteId(page.id)}
                                        onRename={(newTitle) => onPageRename(page.id, newTitle)}
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
    onSelect: () => void
    onDelete: () => void
    onRename: (newTitle: string) => void
}

function SortablePageItem({ page, onSelect, onDelete, onRename }: SortablePageItemProps) {
    const [isEnabled, setIsEnabled] = useState(true)
    const [isRenaming, setIsRenaming] = useState(false)
    const [renameValue, setRenameValue] = useState(page.title)
    
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

    const handleRenameSubmit = () => {
        const trimmed = renameValue.trim()
        if (trimmed && trimmed !== page.title) {
            onRename(trimmed)
        }
        setIsRenaming(false)
    }

    const handleRenameCancel = () => {
        setRenameValue(page.title)
        setIsRenaming(false)
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...(isRenaming ? {} : listeners)}
            onClick={isRenaming ? undefined : onSelect}
            className={cn(
                "group flex items-center gap-3 rounded-xl px-4 py-3 transition-all",
                "bg-white border border-border shadow-sm",
                !isRenaming && "cursor-pointer hover:shadow-md hover:border-border/80",
                isDragging && "opacity-50 z-50 ring-2 ring-primary shadow-lg cursor-grabbing"
            )}
        >
            {/* Title or Rename Input */}
            {isRenaming ? (
                <div className="flex-1 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Input
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameSubmit()
                            if (e.key === 'Escape') handleRenameCancel()
                        }}
                        autoFocus
                        className="h-7 text-sm flex-1"
                    />
                    <Button 
                        size="icon" 
                        className="size-7 shrink-0"
                        onClick={handleRenameSubmit}
                        disabled={!renameValue.trim()}
                    >
                        <Check className="size-3.5" />
                    </Button>
                    <Button 
                        size="icon" 
                        variant="ghost"
                        className="size-7 shrink-0"
                        onClick={handleRenameCancel}
                    >
                        <X className="size-3.5" />
                    </Button>
                </div>
            ) : (
                <span className="flex-1 text-sm font-medium truncate">
                    {page.title}
                </span>
            )}

            {/* Kebab Menu - hidden when renaming */}
            {!isRenaming && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <MoreVertical className="size-4" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem 
                            onClick={(e) => {
                                e.stopPropagation()
                                setIsRenaming(true)
                            }}
                        >
                            <Pencil className="size-4 mr-2" />
                            Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                            onClick={(e) => {
                                e.stopPropagation()
                                onDelete()
                            }}
                            className="text-destructive focus:text-destructive focus:bg-destructive/10"
                        >
                            <Trash2 className="size-4 mr-2" />
                            Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )}

            {/* Toggle - hidden when renaming */}
            {!isRenaming && (
                <Switch
                    checked={isEnabled}
                    onCheckedChange={(checked) => {
                        setIsEnabled(checked)
                    }}
                    onClick={(e) => e.stopPropagation()}
                />
            )}
        </div>
    )
}
