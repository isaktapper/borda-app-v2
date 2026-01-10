'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SpaceHeader } from '@/components/dashboard/space-header'
import { UnifiedEditorSidebar } from '@/components/dashboard/editor/unified-editor-sidebar'
import { WYSIWYGContent } from '@/components/dashboard/editor/wysiwyg-content'
import { EditorEmptyState } from '@/components/dashboard/editor/editor-empty-state'
import { ActivitySidebar } from '@/components/dashboard/activity/activity-sidebar'
import { SettingsContent } from '@/components/dashboard/settings/settings-content'
import { ResponsesTabContent } from '@/components/dashboard/responses-tab-content'
import { getBlocks, bulkUpdateBlocks, deleteTaskBlock } from '@/app/(app)/spaces/[spaceId]/block-actions'
import { reorderPages, deletePage, renamePage } from '@/app/(app)/spaces/[spaceId]/pages-actions'
import type { EngagementScoreResult } from '@/lib/engagement-score'

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

interface Progress {
    progressPercentage: number
    completedTasks: number
    totalTasks: number
    answeredForms: number
    totalForms: number
    uploadedFiles: number
    totalFiles: number
}

interface ProjectV2ClientProps {
    project: any
    spaceId: string
    initialPages: Page[]
    engagement: EngagementScoreResult | null
    progress: Progress | null
    initialTab: 'editor' | 'activity' | 'responses' | 'settings'
    initialPageId?: string
    canRemoveBranding?: boolean
}

export function ProjectV2Client({
    project,
    spaceId,
    initialPages,
    engagement,
    progress,
    initialTab,
    initialPageId,
    canRemoveBranding = false,
}: ProjectV2ClientProps) {
    const router = useRouter()
    const searchParams = useSearchParams()

    // Main state
    const [activeTab, setActiveTab] = useState<'editor' | 'activity' | 'responses' | 'settings'>(initialTab)
    const [pages, setPages] = useState<Page[]>(initialPages)
    const [selectedPageId, setSelectedPageId] = useState<string | null>(initialPageId || null)
    const [pageBlocks, setPageBlocks] = useState<Record<string, Block[]>>({})
    const [isLoadingBlocks, setIsLoadingBlocks] = useState(false)

    // Editor state
    const [sidebarView, setSidebarView] = useState<'pages' | 'blocks' | 'editor'>('pages')
    const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
    const [editingBlock, setEditingBlock] = useState<Block | null>(null)
    const [isDirty, setIsDirty] = useState(false)
    const [deletedBlockIds, setDeletedBlockIds] = useState<string[]>([])
    const [isPending, startTransition] = useTransition()

    // Get current blocks for selected page
    const currentBlocks = selectedPageId ? (pageBlocks[selectedPageId] || []) : []
    const selectedPage = pages.find(p => p.id === selectedPageId)

    // Initialize sidebar view based on initial state
    useEffect(() => {
        if (initialPageId) {
            setSidebarView('blocks')
        }
    }, [initialPageId])

    // Load blocks when page is selected
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

    // Update URL when tab or page changes
    useEffect(() => {
        // Build URL params from scratch - don't include searchParams in deps to avoid infinite loop
        const params = new URLSearchParams()
        params.set('tab', activeTab)
        if (selectedPageId) {
            params.set('page', selectedPageId)
        }
        router.replace(`?${params.toString()}`, { scroll: false })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, selectedPageId])

    // Handle tab change
    const handleTabChange = (tab: 'editor' | 'activity' | 'responses' | 'settings') => {
        setActiveTab(tab)
        if (tab !== 'editor') {
            setSelectedBlockId(null)
            setEditingBlock(null)
        }
    }

    // Handle sidebar view change
    const handleSidebarViewChange = (view: 'pages' | 'blocks' | 'editor') => {
        setSidebarView(view)
        // Don't clear selection - keep context
    }

    // Handle page selection
    const handlePageSelect = (pageId: string) => {
        setSelectedPageId(pageId)
        setSelectedBlockId(null)
        setEditingBlock(null)
        setSidebarView('blocks') // Auto-switch to blocks tab
    }

    // Handle block selection
    const handleBlockSelect = (blockId: string) => {
        setSelectedBlockId(blockId)
        const block = currentBlocks.find(b => b.id === blockId)
        if (block) {
            setEditingBlock(block)
            setSidebarView('editor') // Auto-switch to editor tab
        }
    }

    // Handle block toggle visibility
    const handleBlockToggle = (blockId: string, hidden: boolean) => {
        if (!selectedPageId) return
        setPageBlocks(prev => ({
            ...prev,
            [selectedPageId]: prev[selectedPageId].map(b =>
                b.id === blockId ? { ...b, content: { ...b.content, hidden } } : b
            )
        }))
        setIsDirty(true)
    }

    // Handle block reorder
    const handleBlockReorder = (newBlocks: Block[]) => {
        if (!selectedPageId) return
        setPageBlocks(prev => ({
            ...prev,
            [selectedPageId]: newBlocks.map((b, i) => ({ ...b, sort_order: i }))
        }))
        setIsDirty(true)
    }

    // Handle block content change
    const handleBlockChange = (blockId: string, updates: any) => {
        if (!selectedPageId) return
        setPageBlocks(prev => ({
            ...prev,
            [selectedPageId]: prev[selectedPageId].map(b =>
                b.id === blockId ? { ...b, content: { ...b.content, ...updates } } : b
            )
        }))
        // Update editing block too
        setEditingBlock(prev => prev && prev.id === blockId
            ? { ...prev, content: { ...prev.content, ...updates } }
            : prev
        )
        setIsDirty(true)
    }

    // Handle adding a new block
    const handleAddBlock = (type: string) => {
        if (!selectedPageId) return

        const newId = `new-${Date.now()}`
        let initialContent: any = {}
        if (type === 'text') initialContent = { html: '<p></p>' }
        if (type === 'task') initialContent = { tasks: [] }
        if (type === 'file_upload') initialContent = { label: '', description: '', acceptedTypes: [], maxFiles: 1 }
        if (type === 'file_download') initialContent = { title: '', description: '', files: [] }
        if (type === 'form') initialContent = { questions: [] }
        if (type === 'embed') initialContent = { url: '', type: 'video' }
        if (type === 'contact') initialContent = { name: '', title: '', email: '', phone: '' }
        if (type === 'divider') initialContent = { style: 'line' }

        const newBlock: Block = {
            id: newId,
            type,
            content: initialContent,
            sort_order: currentBlocks.length
        }

        setPageBlocks(prev => ({
            ...prev,
            [selectedPageId]: [...(prev[selectedPageId] || []), newBlock]
        }))
        setIsDirty(true)

        // Select the new block for editing
        setSelectedBlockId(newId)
        setEditingBlock(newBlock)
    }

    // Handle deleting a block
    const handleDeleteBlock = (blockId: string) => {
        if (!selectedPageId) return

        const block = currentBlocks.find(b => b.id === blockId)

        if (block && !block.id.startsWith('new-')) {
            setDeletedBlockIds(prev => [...prev, blockId])
        }

        setPageBlocks(prev => ({
            ...prev,
            [selectedPageId]: prev[selectedPageId].filter(b => b.id !== blockId)
        }))

        if (selectedBlockId === blockId) {
            setSelectedBlockId(null)
            setEditingBlock(null)
        }
        setIsDirty(true)
    }

    // Handle page creation
    const handlePageCreated = (newPage: Page) => {
        setPages(prev => [...prev, newPage])
    }

    // Handle page deletion
    const handlePageDelete = async (pageId: string) => {
        startTransition(async () => {
            const res = await deletePage(pageId, spaceId)
            if (res.success) {
                setPages(prev => prev.filter(p => p.id !== pageId))
                if (selectedPageId === pageId) {
                    setSelectedPageId(null)
                }
            }
        })
    }

    // Handle page reorder
    const handlePagesReorder = (newPages: Page[]) => {
        setPages(newPages)
        setIsDirty(true)
    }

    // Handle page rename
    const handlePageRename = async (pageId: string, newTitle: string) => {
        startTransition(async () => {
            const res = await renamePage(pageId, spaceId, newTitle)
            if (res.success) {
                setPages(prev => prev.map(p =>
                    p.id === pageId ? { ...p, title: newTitle, slug: res.slug || p.slug } : p
                ))
            }
        })
    }

    // Handle save
    const handleSave = async () => {
        startTransition(async () => {
            // 1. Save Page Order
            await reorderPages(spaceId, pages.map(p => p.id))

            // 2. Handle Deletions
            await Promise.all(deletedBlockIds.map(id => deleteTaskBlock(id)))

            // 3. Save Blocks
            const blockSavePromises = Object.entries(pageBlocks).map(([pageId, blocks]) =>
                bulkUpdateBlocks(pageId, spaceId, blocks)
            )
            await Promise.all(blockSavePromises)

            setIsDirty(false)
            setDeletedBlockIds([])

            // Clear cache to force refetch
            const savedPageIds = Object.keys(pageBlocks)
            setPageBlocks(prev => {
                const next = { ...prev }
                savedPageIds.forEach(id => delete next[id])
                return next
            })
        })
    }

    return (
        <div className="flex flex-col h-full">
            {/* Unified Header */}
            <SpaceHeader
                spaceId={spaceId}
                projectName={project.client_name}
                projectStatus={project.status}
                activeTab={activeTab}
                pages={pages}
                selectedPageId={selectedPageId}
                onTabChange={handleTabChange}
                onPageSelect={handlePageSelect}
                isDirty={isDirty}
                isSaving={isPending}
                onSave={handleSave}
            />

            {/* Content Area - Fixed height with overflow */}
            <div className="flex-1 flex overflow-hidden min-h-0">
                {activeTab === 'editor' && (
                    <>
                        {/* Unified Sidebar */}
                        <UnifiedEditorSidebar
                            spaceId={spaceId}
                            activeView={sidebarView}
                            onViewChange={handleSidebarViewChange}
                            pages={pages}
                            selectedPageId={selectedPageId}
                            onPageSelect={handlePageSelect}
                            onPageCreated={handlePageCreated}
                            onPageDelete={handlePageDelete}
                            onPagesReorder={handlePagesReorder}
                            blocks={currentBlocks}
                            isLoadingBlocks={isLoadingBlocks}
                            selectedBlockId={selectedBlockId}
                            onBlockSelect={handleBlockSelect}
                            onBlockToggle={handleBlockToggle}
                            onBlockReorder={handleBlockReorder}
                            onBlockDelete={handleDeleteBlock}
                            onAddBlock={handleAddBlock}
                            editingBlock={editingBlock}
                            onBlockChange={handleBlockChange}
                        />

                        {/* Main Content */}
                        <div className="flex-1 overflow-auto bg-muted/30">
                            {selectedPageId ? (
                                <WYSIWYGContent
                                    blocks={currentBlocks}
                                    selectedBlockId={selectedBlockId}
                                    isLoading={isLoadingBlocks}
                                    onBlockSelect={handleBlockSelect}
                                    onBlockDelete={handleDeleteBlock}
                                />
                            ) : (
                                <EditorEmptyState hasPages={pages.length > 0} />
                            )}
                        </div>
                    </>
                )}

                {activeTab === 'activity' && (
                    <>
                        {/* Activity Sidebar */}
                        <ActivitySidebar
                            spaceId={spaceId}
                            progress={progress}
                            engagement={engagement}
                        />

                        {/* Main Content - Show pages preview */}
                        <div className="flex-1 overflow-auto bg-muted/30">
                            {selectedPageId ? (
                                <WYSIWYGContent
                                    blocks={currentBlocks}
                                    selectedBlockId={selectedBlockId}
                                    isLoading={isLoadingBlocks}
                                    onBlockSelect={handleBlockSelect}
                                    onBlockDelete={handleDeleteBlock}
                                />
                            ) : (
                                <EditorEmptyState hasPages={pages.length > 0} />
                            )}
                        </div>
                    </>
                )}

                {activeTab === 'responses' && (
                    <div className="flex-1 overflow-hidden">
                        <ResponsesTabContent spaceId={spaceId} />
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="flex-1 overflow-hidden">
                        <SettingsContent
                            spaceId={spaceId}
                            organizationId={project.organization_id}
                            projectName={project.client_name}
                            currentAssignee={project.assigned_to}
                            canRemoveBranding={canRemoveBranding}
                        />
                    </div>
                )}
            </div>
        </div>
    )
}

