'use client'

import { cn } from '@/lib/utils'

interface BlockEditorWrapperProps {
    blockType: string
    tabs?: Array<{ id: string; label: string; icon?: any }>
    activeTab?: string
    onTabChange?: (tabId: string) => void
    children: React.ReactNode
}

export function BlockEditorWrapper({
    blockType,
    tabs,
    activeTab,
    onTabChange,
    children
}: BlockEditorWrapperProps) {
    return (
        <div className="flex flex-col h-full">
            {/* Tabs (optional) */}
            {tabs && tabs.length > 0 && (
                <div className="flex border-b bg-muted/20 px-3 pt-2 shrink-0">
                    {tabs.map((tab) => {
                        const Icon = tab.icon
                        return (
                            <button
                                key={tab.id}
                                onClick={() => onTabChange?.(tab.id)}
                                className={cn(
                                    "px-3 py-2 text-sm font-medium rounded-t-md transition-colors flex items-center gap-2",
                                    activeTab === tab.id
                                        ? "bg-background border-t border-x text-foreground"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                )}
                            >
                                {Icon && <Icon className="size-4" />}
                                {tab.label}
                            </button>
                        )
                    })}
                </div>
            )}

            {/* Content area */}
            <div className="flex-1 overflow-y-auto p-4">
                {children}
            </div>
        </div>
    )
}
