'use client'

import { ChevronRight } from 'lucide-react'

interface SidebarHeaderProps {
    activeView: 'pages' | 'blocks' | 'editor'
    onViewChange: (view: 'pages' | 'blocks' | 'editor') => void
    pageTitle?: string
    blockType?: string
}

export function SidebarHeader({
    activeView,
    onViewChange,
    pageTitle,
    blockType
}: SidebarHeaderProps) {
    // Don't show breadcrumb if on pages view
    if (activeView === 'pages') {
        return null
    }

    return (
        <div className="border-b bg-muted/30 shrink-0">
            <div className="px-4 py-3 flex items-center gap-2 text-sm">
                <button
                    onClick={() => onViewChange('pages')}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                >
                    Pages
                </button>

                {pageTitle && (
                    <>
                        <ChevronRight className="size-4 text-muted-foreground/50" />
                        <button
                            onClick={() => onViewChange('blocks')}
                            className="text-muted-foreground hover:text-foreground transition-colors truncate"
                        >
                            {pageTitle}
                        </button>
                    </>
                )}

                {blockType && (
                    <>
                        <ChevronRight className="size-4 text-muted-foreground/50" />
                        <span className="text-foreground font-medium truncate">
                            {blockType}
                        </span>
                    </>
                )}
            </div>
        </div>
    )
}
