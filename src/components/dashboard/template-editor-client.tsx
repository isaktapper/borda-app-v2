'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { TemplateHeader } from '@/components/dashboard/template-header'
import { UnifiedEditorSidebar } from '@/components/dashboard/editor/unified-editor-sidebar'
import { WYSIWYGContent } from '@/components/dashboard/editor/wysiwyg-content'
import { EditorEmptyState } from '@/components/dashboard/editor/editor-empty-state'
import { TemplateSettingsContent } from '@/components/dashboard/editor/template-settings-content'
import { updateTemplateData, updateTemplateSettings } from '@/app/(app)/templates/actions'
import type { Template, TemplateData, TemplatePage, TemplateBlock } from '@/lib/types/templates'

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

interface TemplateEditorClientProps {
    template: Template
    templateId: string
    initialTab: 'editor' | 'settings'
    initialPageId?: string
}

// Convert TemplatePage to Page format for UI
function templatePagesToPages(templatePages: TemplatePage[]): Page[] {
    return templatePages.map((p, index) => ({
        id: p.id || `page-${index}`,
        title: p.title,
        slug: p.slug,
        sort_order: p.sort_order
    }))
}

// Convert TemplateBlock to Block format for UI
function templateBlocksToBlocks(templateBlocks: TemplateBlock[]): Block[] {
    return templateBlocks.map((b, index) => ({
        id: b.id || `block-${index}`,
        type: b.type,
        content: b.content,
        sort_order: b.sort_order
    }))
}

// Convert Pages back to TemplatePage format for saving
function pagesToTemplateData(
    pages: Page[],
    pageBlocks: Record<string, Block[]>
): TemplateData {
    return {
        pages: pages.map(p => ({
            id: p.id,
            title: p.title,
            slug: p.slug,
            sort_order: p.sort_order,
            blocks: (pageBlocks[p.id] || []).map(b => ({
                id: b.id,
                type: b.type,
                sort_order: b.sort_order,
                content: b.content
            }))
        }))
    }
}

// Generate slug from title
function generateSlug(title: string): string {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'untitled'
}

export function TemplateEditorClient({
    template,
    templateId,
    initialTab,
    initialPageId,
}: TemplateEditorClientProps) {
    const router = useRouter()

    // Initialize pages and blocks from template data
    const initialPages = templatePagesToPages(template.template_data.pages)
    const initialPageBlocks: Record<string, Block[]> = {}
    template.template_data.pages.forEach((p, index) => {
        const pageId = p.id || `page-${index}`
        initialPageBlocks[pageId] = templateBlocksToBlocks(p.blocks)
    })

    // Main state
    const [activeTab, setActiveTab] = useState<'editor' | 'settings'>(initialTab)
    const [pages, setPages] = useState<Page[]>(initialPages)
    const [selectedPageId, setSelectedPageId] = useState<string | null>(initialPageId || initialPages[0]?.id || null)
    const [pageBlocks, setPageBlocks] = useState<Record<string, Block[]>>(initialPageBlocks)
    const [isLoadingBlocks] = useState(false) // Templates load all data upfront

    // Editor state
    const [sidebarView, setSidebarView] = useState<'pages' | 'blocks' | 'editor'>('pages')
    const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
    const [editingBlock, setEditingBlock] = useState<Block | null>(null)
    const [isDirty, setIsDirty] = useState(false)
    const [isPending, startTransition] = useTransition()

    // Template settings state
    const [templateName, setTemplateName] = useState(template.name)
    const [templateDescription, setTemplateDescription] = useState(template.description || '')
    const [skipWeekends, setSkipWeekends] = useState(template.skip_weekends ?? true)

    // Get current blocks for selected page
    const currentBlocks = selectedPageId ? (pageBlocks[selectedPageId] || []) : []
    
    // Get ALL blocks from ALL pages (for template mode cross-references)
    const allBlocksFromAllPages = Object.values(pageBlocks).flat()

    // Initialize sidebar view based on initial state
    useEffect(() => {
        if (initialPageId) {
            setSidebarView('blocks')
        }
    }, [initialPageId])

    // Update URL when tab or page changes
    useEffect(() => {
        const params = new URLSearchParams()
        params.set('tab', activeTab)
        if (selectedPageId) {
            params.set('page', selectedPageId)
        }
        router.replace(`?${params.toString()}`, { scroll: false })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, selectedPageId])

    // Handle tab change
    const handleTabChange = (tab: 'editor' | 'settings') => {
        setActiveTab(tab)
        if (tab !== 'editor') {
            setSelectedBlockId(null)
            setEditingBlock(null)
        }
    }

    // Handle sidebar view change
    const handleSidebarViewChange = (view: 'pages' | 'blocks' | 'editor') => {
        setSidebarView(view)
    }

    // Handle page selection
    const handlePageSelect = (pageId: string) => {
        setSelectedPageId(pageId)
        setSelectedBlockId(null)
        setEditingBlock(null)
        setSidebarView('blocks')
    }

    // Handle block selection
    const handleBlockSelect = (blockId: string) => {
        setSelectedBlockId(blockId)
        const block = currentBlocks.find(b => b.id === blockId)
        if (block) {
            setEditingBlock(block)
            setSidebarView('editor')
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
        if (type === 'action_plan') initialContent = { milestones: [], permissions: { stakeholderCanEdit: true, stakeholderCanComplete: true } }
        if (type === 'timeline') initialContent = { title: '', description: '', phases: [], showDates: true }
        if (type === 'next_task') initialContent = { title: '', description: '', actionPlanBlockIds: [], sortMode: 'smart', layoutStyle: 'light', showProgress: true, showMilestoneName: true }
        if (type === 'action_plan_progress') initialContent = { title: '', description: '', viewMode: 'multiple', actionPlanBlockIds: [], showUpcomingTasks: true, maxUpcomingTasks: 3 }
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

        setSelectedBlockId(newId)
        setEditingBlock(newBlock)
    }

    // Handle deleting a block
    const handleDeleteBlock = (blockId: string) => {
        if (!selectedPageId) return

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

    // Handle duplicating a block (local for templates)
    const handleDuplicateBlock = (blockId: string) => {
        if (!selectedPageId) return

        const block = currentBlocks.find(b => b.id === blockId)
        if (!block) return

        const newId = `new-${Date.now()}`
        const duplicatedBlock: Block = {
            id: newId,
            type: block.type,
            content: JSON.parse(JSON.stringify(block.content)), // Deep clone
            sort_order: block.sort_order + 1
        }

        // Shift later blocks down and insert duplicate
        setPageBlocks(prev => {
            const blocks = prev[selectedPageId] || []
            const updated = blocks.map(b =>
                b.sort_order > block.sort_order
                    ? { ...b, sort_order: b.sort_order + 1 }
                    : b
            )
            return {
                ...prev,
                [selectedPageId]: [...updated, duplicatedBlock].sort((a, b) => a.sort_order - b.sort_order)
            }
        })
        setIsDirty(true)
    }

    // Handle moving a block to another page (local for templates)
    const handleMoveBlock = (blockId: string, targetPageId: string) => {
        if (!selectedPageId) return

        const block = currentBlocks.find(b => b.id === blockId)
        if (!block) return

        // Remove from current page
        setPageBlocks(prev => ({
            ...prev,
            [selectedPageId]: prev[selectedPageId].filter(b => b.id !== blockId)
        }))

        // Add to target page
        const targetBlocks = pageBlocks[targetPageId] || []
        const newSortOrder = targetBlocks.length > 0
            ? Math.max(...targetBlocks.map(b => b.sort_order)) + 1
            : 0

        setPageBlocks(prev => ({
            ...prev,
            [targetPageId]: [...(prev[targetPageId] || []), { ...block, sort_order: newSortOrder }]
        }))

        if (selectedBlockId === blockId) {
            setSelectedBlockId(null)
            setEditingBlock(null)
        }
        setIsDirty(true)
    }

    // Handle page creation (for templates, this creates a local page)
    const handlePageCreated = (newPage: Page) => {
        setPages(prev => [...prev, newPage])
        setPageBlocks(prev => ({ ...prev, [newPage.id]: [] }))
        setIsDirty(true)
    }

    // Handle page deletion
    const handlePageDelete = async (pageId: string) => {
        setPages(prev => prev.filter(p => p.id !== pageId))
        setPageBlocks(prev => {
            const next = { ...prev }
            delete next[pageId]
            return next
        })
        if (selectedPageId === pageId) {
            const remainingPages = pages.filter(p => p.id !== pageId)
            setSelectedPageId(remainingPages[0]?.id || null)
        }
        setIsDirty(true)
    }

    // Handle page rename
    const handlePageRename = async (pageId: string, newTitle: string) => {
        setPages(prev => prev.map(p => 
            p.id === pageId ? { ...p, title: newTitle } : p
        ))
        setIsDirty(true)
    }

    // Handle page reorder
    const handlePagesReorder = (newPages: Page[]) => {
        setPages(newPages.map((p, i) => ({ ...p, sort_order: i })))
        setIsDirty(true)
    }

    // Handle template settings update
    const handleSettingsUpdate = async (
        name: string,
        description: string,
        skipWkends: boolean
    ) => {
        setTemplateName(name)
        setTemplateDescription(description)
        setSkipWeekends(skipWkends)

        startTransition(async () => {
            await updateTemplateSettings(
                templateId,
                name,
                description || undefined,
                skipWkends
            )
        })
    }

    // Handle save
    const handleSave = async () => {
        startTransition(async () => {
            const templateData = pagesToTemplateData(pages, pageBlocks)
            await updateTemplateData(templateId, templateData)
            setIsDirty(false)
        })
    }

    // Create page action for templates (local, no server call)
    const handleCreatePage = () => {
        const newPage: Page = {
            id: `page-${Date.now()}`,
            title: 'New Page',
            slug: generateSlug('New Page'),
            sort_order: pages.length
        }
        handlePageCreated(newPage)
        handlePageSelect(newPage.id)
    }

    return (
        <div className="flex flex-col h-full">
            {/* Template Header */}
            <TemplateHeader
                templateId={templateId}
                templateName={templateName}
                activeTab={activeTab}
                pages={pages}
                selectedPageId={selectedPageId}
                onTabChange={handleTabChange}
                onPageSelect={handlePageSelect}
                isDirty={isDirty}
                isSaving={isPending}
                onSave={handleSave}
            />

            {/* Content Area */}
            <div className="flex-1 flex overflow-hidden min-h-0">
                {activeTab === 'editor' && (
                    <>
                        {/* Unified Sidebar - with template mode */}
                        <UnifiedEditorSidebar
                            spaceId={templateId} // Use templateId as identifier
                            activeView={sidebarView}
                            onViewChange={handleSidebarViewChange}
                            pages={pages}
                            selectedPageId={selectedPageId}
                            onPageSelect={handlePageSelect}
                            onPageCreated={handlePageCreated}
                            onPageDelete={handlePageDelete}
                            onPageRename={handlePageRename}
                            onPagesReorder={handlePagesReorder}
                            blocks={currentBlocks}
                            isLoadingBlocks={isLoadingBlocks}
                            selectedBlockId={selectedBlockId}
                            onBlockSelect={handleBlockSelect}
                            onBlockToggle={handleBlockToggle}
                            onBlockReorder={handleBlockReorder}
                            onBlockDelete={handleDeleteBlock}
                            onBlockDuplicate={handleDuplicateBlock}
                            onBlockMove={handleMoveBlock}
                            onAddBlock={handleAddBlock}
                            editingBlock={editingBlock}
                            onBlockChange={handleBlockChange}
                            isTemplateMode={true}
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
                                    allBlocksFromAllPages={allBlocksFromAllPages}
                                />
                            ) : (
                                <EditorEmptyState hasPages={pages.length > 0} />
                            )}
                        </div>
                    </>
                )}

                {activeTab === 'settings' && (
                    <div className="flex-1 overflow-hidden">
                        <TemplateSettingsContent
                            templateId={templateId}
                            name={templateName}
                            description={templateDescription}
                            skipWeekends={skipWeekends}
                            onUpdate={handleSettingsUpdate}
                            isSaving={isPending}
                        />
                    </div>
                )}
            </div>
        </div>
    )
}
