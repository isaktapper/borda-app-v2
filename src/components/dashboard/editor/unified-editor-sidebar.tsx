'use client'

import { SidebarHeader } from './sidebar-header'
import { PagesTabContent } from './pages-tab-content'
import { BlocksTabContent } from './blocks-tab-content'
import { EditorTabContent } from './editor-tab-content'
import type { WelcomePopupContent } from './welcome-popup-editor'

interface Page {
    id: string
    title: string
    slug: string
    sort_order: number
}

interface Block {
    id: string
    type: string
    content: any
    sort_order: number
}

interface UnifiedEditorSidebarProps {
    spaceId: string

    // Navigation state
    activeView: 'pages' | 'blocks' | 'editor'
    onViewChange: (view: 'pages' | 'blocks' | 'editor') => void

    // Pages tab
    pages: Page[]
    selectedPageId: string | null
    onPageSelect: (pageId: string) => void
    onPageCreated: (page: Page) => void
    onPageDelete: (pageId: string) => void
    onPageRename: (pageId: string, newTitle: string) => void
    onPagesReorder: (pages: Page[]) => void

    // Blocks tab
    blocks: Block[]
    isLoadingBlocks: boolean
    selectedBlockId: string | null
    onBlockSelect: (blockId: string) => void
    onBlockToggle: (blockId: string, hidden: boolean) => void
    onBlockReorder: (blocks: Block[]) => void
    onBlockDelete: (blockId: string) => void
    onBlockDuplicate: (blockId: string) => void
    onBlockMove: (blockId: string, targetPageId: string) => void
    onAddBlock: (type: string) => void

    // Editor tab
    editingBlock: Block | null
    onBlockChange: (blockId: string, updates: any) => void

    // Welcome popup
    welcomePopup?: WelcomePopupContent | null
    onWelcomePopupSave?: (content: WelcomePopupContent) => Promise<void>

    // Template mode
    isTemplateMode?: boolean
}

export function UnifiedEditorSidebar({
    spaceId,
    activeView,
    onViewChange,
    pages,
    selectedPageId,
    onPageSelect,
    onPageCreated,
    onPageDelete,
    onPageRename,
    onPagesReorder,
    blocks,
    isLoadingBlocks,
    selectedBlockId,
    onBlockSelect,
    onBlockToggle,
    onBlockReorder,
    onBlockDelete,
    onBlockDuplicate,
    onBlockMove,
    onAddBlock,
    editingBlock,
    onBlockChange,
    welcomePopup,
    onWelcomePopupSave,
    isTemplateMode = false,
}: UnifiedEditorSidebarProps) {
    // Get page title and block type for breadcrumb
    const selectedPage = pages.find(p => p.id === selectedPageId)
    const pageTitle = selectedPage?.title
    const blockType = editingBlock ? getBlockTypeLabel(editingBlock.type) : undefined

    return (
        <div className="w-[480px] h-full flex flex-col border-r bg-background shrink-0">
            {/* Header with tabs */}
            <SidebarHeader
                activeView={activeView}
                onViewChange={onViewChange}
                pageTitle={pageTitle}
                blockType={blockType}
            />

            {/* Content area */}
            <div className="flex-1 overflow-y-auto">
                {activeView === 'pages' && (
                    <PagesTabContent
                        spaceId={spaceId}
                        pages={pages}
                        onPageSelect={onPageSelect}
                        onPageCreated={onPageCreated}
                        onPageDelete={onPageDelete}
                        onPageRename={onPageRename}
                        onPagesReorder={onPagesReorder}
                        welcomePopup={welcomePopup}
                        onWelcomePopupSave={onWelcomePopupSave}
                        isTemplateMode={isTemplateMode}
                    />
                )}
                {activeView === 'blocks' && (
                    <BlocksTabContent
                        spaceId={spaceId}
                        pageTitle={pageTitle || 'Untitled Page'}
                        blocks={blocks}
                        isLoadingBlocks={isLoadingBlocks}
                        selectedBlockId={selectedBlockId}
                        currentPageId={selectedPageId}
                        pages={pages}
                        onBlockSelect={onBlockSelect}
                        onBlockToggle={onBlockToggle}
                        onBlockReorder={onBlockReorder}
                        onBlockDelete={onBlockDelete}
                        onBlockDuplicate={onBlockDuplicate}
                        onBlockMove={onBlockMove}
                        onAddBlock={onAddBlock}
                        onBack={() => onViewChange('pages')}
                    />
                )}
                {activeView === 'editor' && (
                    <EditorTabContent
                        editingBlock={editingBlock}
                        spaceId={spaceId}
                        onBlockChange={onBlockChange}
                        onBack={() => onViewChange('blocks')}
                        isTemplateMode={isTemplateMode}
                    />
                )}
            </div>
        </div>
    )
}

function getBlockTypeLabel(type: string): string {
    const labels: Record<string, string> = {
        text: 'Text Block',
        action_plan: 'Action Plan',
        action_plan_progress: 'Progress',
        next_task: 'Next Task',
        timeline: 'Timeline',
        task: 'To-do List',
        form: 'Form',
        file_upload: 'File Upload',
        file_download: 'File Download',
        embed: 'Video / Embed',
        contact: 'Contact Card',
        divider: 'Divider'
    }
    return labels[type] || 'Block'
}
