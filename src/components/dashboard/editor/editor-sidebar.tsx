'use client'

import { useState } from 'react'
import { PagesListView } from './pages-list'
import { BlocksListView } from './blocks-list'

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

interface EditorSidebarProps {
    projectId: string
    pages: Page[]
    selectedPageId: string | null
    blocks: Block[]
    isLoadingBlocks: boolean
    onPageSelect: (pageId: string) => void
    onPageBack: () => void
    onBlockSelect: (blockId: string) => void
    onBlockToggle: (blockId: string, hidden: boolean) => void
    onBlockReorder: (blocks: Block[]) => void
    onBlockDelete: (blockId: string) => void
    onAddBlock: (type: string) => void
    onPageCreated: (page: Page) => void
    onPageDelete: (pageId: string) => void
    onPagesReorder: (pages: Page[]) => void
}

export function EditorSidebar({
    projectId,
    pages,
    selectedPageId,
    blocks,
    isLoadingBlocks,
    onPageSelect,
    onPageBack,
    onBlockSelect,
    onBlockToggle,
    onBlockReorder,
    onBlockDelete,
    onAddBlock,
    onPageCreated,
    onPageDelete,
    onPagesReorder
}: EditorSidebarProps) {
    const selectedPage = pages.find(p => p.id === selectedPageId)

    return (
        <div className="w-72 border-r bg-background flex flex-col h-full overflow-hidden shrink-0">
            {selectedPageId ? (
                <BlocksListView
                    pageTitle={selectedPage?.title || ''}
                    blocks={blocks}
                    isLoading={isLoadingBlocks}
                    onBack={onPageBack}
                    onBlockSelect={onBlockSelect}
                    onBlockToggle={onBlockToggle}
                    onBlockReorder={onBlockReorder}
                    onBlockDelete={onBlockDelete}
                    onAddBlock={onAddBlock}
                />
            ) : (
                <PagesListView
                    projectId={projectId}
                    pages={pages}
                    onPageSelect={onPageSelect}
                    onPageCreated={onPageCreated}
                    onPageDelete={onPageDelete}
                    onPagesReorder={onPagesReorder}
                />
            )}
        </div>
    )
}

