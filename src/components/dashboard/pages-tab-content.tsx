'use client'

import { useState, useEffect, useTransition } from 'react'
import { FileText, Save, Loader2 } from 'lucide-react'
import { PagesSidebar } from './pages-sidebar'
import { Button } from '@/components/ui/button'
import { reorderPages, deletePage } from '@/app/dashboard/projects/[projectId]/pages-actions'
import { BlockEditor } from './editor/block-editor'
import { getBlocks, bulkUpdateBlocks, deleteTaskBlock } from '@/app/dashboard/projects/[projectId]/block-actions'

interface Block {
    id: string
    type: string
    content: any
    sort_order: number
}

interface Page {
    id: string
    title: string
    slug: string
    sort_order: number
}

interface PagesTabContentProps {
    projectId: string
    initialPages: Page[]
}

export function PagesTabContent({ projectId, initialPages }: PagesTabContentProps) {
    const [pages, setPages] = useState<Page[]>(initialPages)
    const [pageBlocks, setPageBlocks] = useState<Record<string, Block[]>>({})
    const [deletedBlockIds, setDeletedBlockIds] = useState<string[]>([])
    const [selectedPageId, setSelectedPageId] = useState<string>(pages[0]?.id || '')
    const [isDirty, setIsDirty] = useState(false)
    const [isLoadingBlocks, setIsLoadingBlocks] = useState(false)
    const [isPending, startTransition] = useTransition()

    const selectedPage = pages.find(p => p.id === selectedPageId)

    // Load blocks when selected page changes
    useEffect(() => {
        if (!selectedPageId || pageBlocks[selectedPageId]) return

        const fetchBlocks = async () => {
            setIsLoadingBlocks(true)
            const blocks = await getBlocks(selectedPageId)
            setPageBlocks(prev => ({ ...prev, [selectedPageId]: blocks as Block[] }))
            setIsLoadingBlocks(false)
        }
        fetchBlocks()
    }, [selectedPageId, pageBlocks])

    const handleOrderChange = (newPages: Page[]) => {
        setPages(newPages)
        setIsDirty(true)
    }

    const handleBlocksChange = (pageId: string, newBlocks: Block[]) => {
        // Track deletions
        const currentBlocks = pageBlocks[pageId] || []
        const newBlockIds = new Set(newBlocks.map(b => b.id))
        const removedIds = currentBlocks
            .filter(b => !newBlockIds.has(b.id) && !b.id.startsWith('new-'))
            .map(b => b.id)

        if (removedIds.length > 0) {
            setDeletedBlockIds(prev => [...prev, ...removedIds])
        }

        setPageBlocks(prev => ({ ...prev, [pageId]: newBlocks }))
        setIsDirty(true)
    }

    const handleSaveAll = async () => {
        startTransition(async () => {
            // 1. Save Page Order
            const pageRes = await reorderPages(projectId, pages.map(p => p.id))

            // 2. Handle Deletions (Cleanup tasks and soft-delete blocks)
            const deleteResults = await Promise.all(deletedBlockIds.map(id => deleteTaskBlock(id)))
            const deleteSucceeded = deleteResults.every(r => r.success)

            if (!deleteSucceeded) {
                const errors = deleteResults.filter(r => r.error).map(r => r.error)
                console.error('Vissa block kunde inte raderas:', errors)
                alert(`Kunde inte radera vissa block: ${errors.join(', ')}`)
            }

            // 3. Save Blocks for ALL "touched" pages
            const blockSavePromises = Object.entries(pageBlocks).map(([pageId, blocks]) =>
                bulkUpdateBlocks(pageId, projectId, blocks)
            )
            const blockResults = await Promise.all(blockSavePromises)

            if (pageRes.success && blockResults.every(r => r.success) && deleteSucceeded) {
                setIsDirty(false)
                setDeletedBlockIds([])
                // Clear the cache for the pages we just saved to force a refetch with real UUIDs
                const savedPageIds = Object.keys(pageBlocks)
                setPageBlocks(prev => {
                    const next = { ...prev }
                    savedPageIds.forEach(id => delete next[id])
                    return next
                })
            } else {
                console.error('Failed to save some changes')
            }
        })
    }

    const handlePageDelete = async (pageId: string) => {
        startTransition(async () => {
            const res = await deletePage(pageId, projectId)
            if (res.success) {
                setPages(prev => prev.filter(p => p.id !== pageId))
                if (selectedPageId === pageId) {
                    setSelectedPageId(pages.find(p => p.id !== pageId)?.id || '')
                }
            } else {
                console.error('Failed to delete page:', res.error)
            }
        })
    }

    const handlePageSelect = (id: string) => {
        setSelectedPageId(id)
    }

    return (
        <div className="flex h-full">
            <PagesSidebar
                projectId={projectId}
                pages={pages}
                selectedPageId={selectedPageId}
                onSelect={handlePageSelect}
                onOrderChange={handleOrderChange}
                onPageDelete={handlePageDelete}
                onPageCreated={(newPage) => setPages(prev => [...prev, newPage])}
            />

            <div className="flex-1 flex flex-col min-w-0">
                {isDirty && (
                    <div className="p-4 bg-primary/5 border-b border-primary/20 flex items-center justify-between animate-in slide-in-from-top duration-300">
                        <div className="flex items-center gap-2 text-sm font-medium text-primary">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                            </span>
                            Osparade ändringar i projektet
                        </div>
                        <Button
                            size="sm"
                            onClick={handleSaveAll}
                            disabled={isPending}
                            className="gap-2 shadow-lg hover:shadow-primary/20 transition-all font-semibold"
                        >
                            {isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                            Spara ändringar
                        </Button>
                    </div>
                )}

                <div className="flex-1 overflow-hidden flex flex-col">
                    {selectedPage ? (
                        <div className="h-full flex flex-col p-6">
                            <div className="mb-6 group">
                                <h2 className="text-3xl font-bold tracking-tight text-foreground/90 group-hover:text-foreground transition-colors uppercase">
                                    {selectedPage.title}
                                </h2>
                                <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2 font-medium">
                                    <span className="px-1.5 py-0.5 bg-muted rounded font-mono text-[10px] tracking-tight">{selectedPage.slug}</span>
                                    • Editera sidans innehåll nedan
                                </p>
                            </div>

                            <div className="flex-1 overflow-y-auto pr-2 -mr-2 scrollbar-none">
                                <BlockEditor
                                    pageId={selectedPage.id}
                                    projectId={projectId}
                                    blocks={pageBlocks[selectedPage.id] || []}
                                    onBlocksChange={(newBlocks) => handleBlocksChange(selectedPage.id, newBlocks)}
                                    isLoading={isLoadingBlocks}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-3xl bg-muted/10 border-muted-foreground/5">
                            <div className="p-6 rounded-full bg-muted/20 mb-6 group-hover:scale-110 transition-transform duration-500">
                                <FileText className="size-12 text-muted-foreground/30" />
                            </div>
                            <h3 className="text-xl font-bold text-foreground/70">Ingen sida vald</h3>
                            <p className="text-sm text-muted-foreground max-w-xs mt-2 italic font-medium">
                                Välj en sida i sidofältet till vänster eller skapa en ny för att börja bygga din portal.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
