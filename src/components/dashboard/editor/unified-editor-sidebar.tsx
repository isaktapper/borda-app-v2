'use client'

import { SidebarHeader } from './sidebar-header'
import { PagesTabContent } from './pages-tab-content'
import { BlocksTabContent } from './blocks-tab-content'
import { EditorTabContent } from './editor-tab-content'

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
    onPagesReorder: (pages: Page[]) => void

    // Blocks tab
    blocks: Block[]
    isLoadingBlocks: boolean
    selectedBlockId: string | null
    onBlockSelect: (blockId: string) => void
    onBlockToggle: (blockId: string, hidden: boolean) => void
    onBlockReorder: (blocks: Block[]) => void
    onBlockDelete: (blockId: string) => void
    onAddBlock: (type: string) => void

    // Editor tab
    editingBlock: Block | null
    onBlockChange: (blockId: string, updates: any) => void
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
    onPagesReorder,
    blocks,
    isLoadingBlocks,
    selectedBlockId,
    onBlockSelect,
    onBlockToggle,
    onBlockReorder,
    onBlockDelete,
    onAddBlock,
    editingBlock,
    onBlockChange
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
                        onPagesReorder={onPagesReorder}
                    />
                )}
                {activeView === 'blocks' && (
                    <BlocksTabContent
                        spaceId={spaceId}
                        blocks={blocks}
                        isLoadingBlocks={isLoadingBlocks}
                        selectedBlockId={selectedBlockId}
                        onBlockSelect={onBlockSelect}
                        onBlockToggle={onBlockToggle}
                        onBlockReorder={onBlockReorder}
                        onBlockDelete={onBlockDelete}
                        onAddBlock={onAddBlock}
                    />
                )}
                {activeView === 'editor' && (
                    <EditorTabContent
                        editingBlock={editingBlock}
                        spaceId={spaceId}
                        onBlockChange={onBlockChange}
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
