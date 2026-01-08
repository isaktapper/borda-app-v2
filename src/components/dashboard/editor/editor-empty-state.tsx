'use client'

import { FileText, ArrowLeft, Sparkles, Layers } from 'lucide-react'

interface EditorEmptyStateProps {
    hasPages: boolean
}

export function EditorEmptyState({ hasPages }: EditorEmptyStateProps) {
    if (!hasPages) {
        return (
            <div className="flex items-center justify-center h-full px-6">
                <div className="max-w-md text-center space-y-6">
                    {/* Decorative illustration */}
                    <div className="relative mx-auto w-40 h-40">
                        {/* Background shapes */}
                        <div className="absolute top-4 left-4 w-24 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-xl rotate-[-8deg]" />
                        <div className="absolute top-8 left-12 w-24 h-32 bg-gradient-to-br from-primary/15 to-transparent rounded-xl rotate-[4deg]" />
                        <div className="absolute top-2 left-8 w-24 h-32 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl border border-primary/10 shadow-lg">
                            <div className="p-3 space-y-2">
                                <div className="h-2 w-12 bg-primary/20 rounded" />
                                <div className="h-1.5 w-16 bg-muted rounded" />
                                <div className="h-1.5 w-14 bg-muted rounded" />
                                <div className="h-1.5 w-10 bg-muted rounded" />
                            </div>
                        </div>
                        {/* Sparkle accent */}
                        <div className="absolute top-0 right-6 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Sparkles className="size-4 text-primary" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-2xl font-semibold text-foreground">
                            Welcome to your portal editor
                        </h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Create pages to organize your content, then add blocks like text, tasks, forms, and files
                            to build an engaging experience for your client.
                        </p>
                    </div>

                    {/* Getting started hint */}
                    <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary/5 rounded-full text-sm">
                        <ArrowLeft className="size-4 text-primary" />
                        <span className="text-muted-foreground">
                            Click <span className="font-medium text-foreground">"Create first page"</span> in the sidebar
                        </span>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="flex items-center justify-center h-full px-6">
            <div className="max-w-md text-center space-y-6">
                {/* Decorative illustration */}
                <div className="relative mx-auto w-32 h-32">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-3xl rotate-6" />
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent rounded-3xl -rotate-3" />
                    <div className="relative h-full flex items-center justify-center">
                        <Layers className="size-12 text-primary/60" />
                    </div>
                </div>

                <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-foreground">
                        Select a page to edit
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                        Choose a page from the sidebar to start editing its content, 
                        or create a new page to add more sections.
                    </p>
                </div>

                {/* Hint */}
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-full text-xs text-muted-foreground">
                    <ArrowLeft className="size-3.5" />
                    <span>Select from the sidebar</span>
                </div>
            </div>
        </div>
    )
}

