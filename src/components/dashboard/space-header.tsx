'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Edit3, Activity, Settings, ExternalLink, Share2, Save, Loader2, ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { PageTabs } from './page-tabs'
import { PortalPreview } from '@/components/dashboard/portal-preview'
import { ShareModal } from '@/components/dashboard/share-modal'

interface Page {
    id: string
    title: string
    slug: string
    sort_order: number
}

interface SpaceHeaderProps {
    spaceId: string
    projectName: string
    projectStatus?: string
    activeTab: 'editor' | 'activity' | 'responses' | 'settings'
    pages: Page[]
    selectedPageId: string | null
    onTabChange: (tab: 'editor' | 'activity' | 'responses' | 'settings') => void
    onPageSelect: (pageId: string) => void
    isDirty?: boolean
    isSaving?: boolean
    onSave?: () => void
    onStatusChange?: (status: string) => void
}

const TABS = [
    { id: 'editor' as const, label: 'Editor', icon: Edit3 },
    { id: 'activity' as const, label: 'Activity', icon: Activity },
    { id: 'responses' as const, label: 'Responses', icon: ClipboardList },
    { id: 'settings' as const, label: 'Settings', icon: Settings },
]

export function SpaceHeader({
    spaceId,
    projectName,
    projectStatus,
    activeTab,
    pages,
    selectedPageId,
    onTabChange,
    onPageSelect,
    isDirty,
    isSaving,
    onSave,
    onStatusChange
}: SpaceHeaderProps) {
    const [shareModalOpen, setShareModalOpen] = useState(false)

    return (
        <header className="bg-background border-b shrink-0">
            <div className="h-14 px-4">
                <div className="flex items-center h-full gap-4">
                    {/* Left: Back + Main Tabs */}
                    <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="sm" asChild className="gap-1.5 -ml-2 mr-2">
                            <Link href="/spaces">
                                <ArrowLeft className="size-4" />
                                <span className="hidden sm:inline">Spaces</span>
                            </Link>
                        </Button>

                        <div className="h-6 w-px bg-border mx-1" />

                        <nav className="flex items-center gap-1">
                            {TABS.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => onTabChange(tab.id)}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                                        activeTab === tab.id
                                            ? "bg-primary text-primary-foreground"
                                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                    )}
                                >
                                    <tab.icon className="size-4" />
                                    <span className="hidden md:inline">{tab.label}</span>
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Center: Page Tabs (only in Editor mode) */}
                    <div className="flex-1 flex justify-center min-w-0 overflow-hidden">
                        {activeTab === 'editor' && pages.length > 0 && (
                            <PageTabs
                                pages={pages}
                                selectedPageId={selectedPageId}
                                onPageSelect={onPageSelect}
                            />
                        )}
                        {activeTab !== 'editor' && (
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm truncate max-w-[200px]">
                                    {projectName}
                                </span>
                                {projectStatus && (
                                    <span className="text-xs px-2.5 py-1 rounded-md bg-gray-100 text-gray-600 capitalize font-medium">
                                        {projectStatus}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center justify-end gap-2 shrink-0">
                        {isDirty && (
                            <Button
                                size="sm"
                                onClick={onSave}
                                disabled={isSaving}
                                className="gap-1.5"
                            >
                                {isSaving ? (
                                    <Loader2 className="size-4 animate-spin" />
                                ) : (
                                    <Save className="size-4" />
                                )}
                                Save
                            </Button>
                        )}

                        <PortalPreview spaceId={spaceId} projectName={projectName} />

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShareModalOpen(true)}
                            className="gap-1.5"
                        >
                            <Share2 className="size-4" />
                            <span className="hidden sm:inline">Share</span>
                        </Button>
                    </div>
                </div>
            </div>

            <ShareModal
                open={shareModalOpen}
                onOpenChange={setShareModalOpen}
                spaceId={spaceId}
                onStatusChange={onStatusChange}
            />
        </header>
    )
}

