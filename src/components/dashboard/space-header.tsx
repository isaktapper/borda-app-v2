'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Edit3, Activity, Settings, Share2, Save, Loader2, ClipboardList, ChevronDown, Check, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
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
    activeTab: 'editor' | 'activity' | 'responses' | 'chat' | 'settings'
    pages: Page[]
    selectedPageId: string | null
    onTabChange: (tab: 'editor' | 'activity' | 'responses' | 'chat' | 'settings') => void
    onPageSelect: (pageId: string) => void
    isDirty?: boolean
    isSaving?: boolean
    onSave?: () => void
    onStatusChange?: (status: string) => void
    chatUnreadCount?: number
}

const TABS = [
    { id: 'editor' as const, label: 'Editor', icon: Edit3 },
    { id: 'activity' as const, label: 'Activity', icon: Activity },
    { id: 'responses' as const, label: 'Responses', icon: ClipboardList },
    { id: 'chat' as const, label: 'Chat', icon: MessageCircle },
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
    onStatusChange,
    chatUnreadCount = 0,
}: SpaceHeaderProps) {
    const [shareModalOpen, setShareModalOpen] = useState(false)

    return (
        <header className="bg-background border-b shrink-0">
            <div className="h-14 px-4">
                <div className="flex items-center h-full gap-4">
                    {/* Left: Back + Main Tabs */}
                    <div className="flex items-center gap-1 shrink-0">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" asChild className="-ml-2 mr-2 size-9">
                                    <Link href="/spaces">
                                        <ArrowLeft className="size-5" />
                                    </Link>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                                Back to Spaces
                            </TooltipContent>
                        </Tooltip>

                        <div className="h-6 w-px bg-border mx-1" />

                        <nav id="tour-space-tabs" className="flex items-center gap-1">
                            {TABS.map((tab) => (
                                <Tooltip key={tab.id}>
                                    <TooltipTrigger asChild>
                                        <button
                                            id={tab.id === 'settings' ? 'tour-settings-tab' : undefined}
                                            onClick={() => onTabChange(tab.id)}
                                            className={cn(
                                                "relative flex items-center justify-center size-9 rounded-md transition-colors",
                                                activeTab === tab.id
                                                    ? "bg-primary text-primary-foreground"
                                                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                            )}
                                        >
                                            <tab.icon className="size-4" />
                                            {tab.id === 'chat' && chatUnreadCount > 0 && activeTab !== 'chat' && (
                                                <span className="absolute -top-1 -right-1 size-4 flex items-center justify-center rounded-full bg-destructive text-[9px] font-medium text-destructive-foreground">
                                                    {chatUnreadCount > 9 ? '9+' : chatUnreadCount}
                                                </span>
                                            )}
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">
                                        {tab.label} {tab.id === 'chat' && chatUnreadCount > 0 ? `(${chatUnreadCount})` : ''}
                                    </TooltipContent>
                                </Tooltip>
                            ))}
                        </nav>
                    </div>

                    {/* Center: Page Dropdown (in Editor and Chat mode) */}
                    <div className="flex-1 flex justify-center min-w-0">
                        {(activeTab === 'editor' || activeTab === 'chat') && pages.length > 0 && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="w-[280px] h-9 justify-between font-normal hover:bg-muted/50 transition-all duration-200 focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-0 focus:outline-none"
                                    >
                                        <span className="truncate">
                                            {selectedPageId
                                                ? pages.find(p => p.id === selectedPageId)?.title || 'Select page'
                                                : 'Select page'}
                                        </span>
                                        <ChevronDown className="size-4 opacity-50 shrink-0" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    side="bottom"
                                    align="center"
                                    sideOffset={4}
                                    className="w-[280px]"
                                >
                                    {[...pages].sort((a, b) => a.sort_order - b.sort_order).map((page) => (
                                        <DropdownMenuItem
                                            key={page.id}
                                            onClick={() => onPageSelect(page.id)}
                                            className="justify-between"
                                        >
                                            <span className="truncate">{page.title}</span>
                                            {selectedPageId === page.id && (
                                                <Check className="size-4 shrink-0" />
                                            )}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                        {activeTab !== 'editor' && activeTab !== 'chat' && (
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
                    <div id="tour-space-actions" className="flex items-center justify-end gap-2 shrink-0">
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
                            id="tour-share-button"
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

