'use client'

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
    // Hide breadcrumbs - navigation is now handled differently
    return null
}
