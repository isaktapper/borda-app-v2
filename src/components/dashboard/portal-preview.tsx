'use client'

import { useState, useEffect } from 'react'
import { Eye, X, Loader2, LayoutDashboard, FileText, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog'
import { PortalBlockRenderer } from '@/components/portal/block-renderers'
import { PortalProvider } from '@/components/portal/portal-context'
import { cn } from '@/lib/utils'
import Image from 'next/image'

interface Page {
    id: string
    title: string
    slug: string
}

interface Block {
    id: string
    type: string
    content: any
}

interface Branding {
    color: string
    logoUrl: string | null
    gradientCSS: string
}

interface Project {
    name: string
    organization?: {
        name: string
        logo_url?: string
    }
}

interface PortalPreviewProps {
    projectId: string
    projectName: string
}

function hexToHSL(hex: string): string {
    hex = hex.replace('#', '')
    const r = parseInt(hex.substring(0, 2), 16) / 255
    const g = parseInt(hex.substring(2, 4), 16) / 255
    const b = parseInt(hex.substring(4, 6), 16) / 255

    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let h = 0
    let s = 0
    const l = (max + min) / 2

    if (max !== min) {
        const d = max - min
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

        switch (max) {
            case r:
                h = ((g - b) / d + (g < b ? 6 : 0)) / 6
                break
            case g:
                h = ((b - r) / d + 2) / 6
                break
            case b:
                h = ((r - g) / d + 4) / 6
                break
        }
    }

    const hDeg = Math.round(h * 360)
    const sPercent = Math.round(s * 100)
    const lPercent = Math.round(l * 100)

    return `${hDeg} ${sPercent}% ${lPercent}%`
}

export function PortalPreview({ projectId, projectName }: PortalPreviewProps) {
    const [open, setOpen] = useState(false)
    const [project, setProject] = useState<Project | null>(null)
    const [pages, setPages] = useState<Page[]>([])
    const [selectedPage, setSelectedPage] = useState<Page | null>(null)
    const [blocks, setBlocks] = useState<Block[]>([])
    const [loading, setLoading] = useState(false)
    const [blocksLoading, setBlocksLoading] = useState(false)
    const [branding, setBranding] = useState<Branding | null>(null)
    const [showOverview, setShowOverview] = useState(true)

    // Fetch project and pages when preview opens
    useEffect(() => {
        if (open && pages.length === 0) {
            fetchProjectData()
        }
    }, [open])

    // Fetch blocks when page is selected
    useEffect(() => {
        if (selectedPage) {
            setShowOverview(false)
            fetchBlocks(selectedPage.id)
        }
    }, [selectedPage])

    const fetchProjectData = async () => {
        setLoading(true)
        try {
            const { getProject } = await import('@/app/(app)/projects/actions')
            const { getPages } = await import('@/app/(app)/projects/[projectId]/pages-actions')
            const { getPortalBranding } = await import('@/app/portal/branding-actions')

            const [projectData, pagesData, brandingData] = await Promise.all([
                getProject(projectId),
                getPages(projectId),
                getPortalBranding(projectId)
            ])

            if (projectData) {
                setProject(projectData as Project)
            }
            setPages(pagesData as Page[])
            if (brandingData) {
                setBranding(brandingData as Branding)
            }
            // Start on Overview
            setShowOverview(true)
            setSelectedPage(null)
        } catch (error) {
            console.error('Error fetching project data:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchBlocks = async (pageId: string) => {
        setBlocksLoading(true)
        try {
            const { getBlocks } = await import('@/app/(app)/projects/[projectId]/block-actions')
            const blocksData = await getBlocks(pageId)
            setBlocks(blocksData as Block[])
        } catch (error) {
            console.error('Error fetching blocks:', error)
        } finally {
            setBlocksLoading(false)
        }
    }

    const handleOverviewClick = () => {
        setShowOverview(true)
        setSelectedPage(null)
        setBlocks([])
    }

    const handlePageClick = (page: Page) => {
        setShowOverview(false)
        setSelectedPage(page)
    }

    // Generate CSS variables for branding
    const primaryHSL = branding ? hexToHSL(branding.color) : '84 85% 67%'
    const gradientCSS = branding?.gradientCSS || 'linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 100%)'

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Eye className="size-4" />
                    Preview
                </Button>
            </DialogTrigger>
            <DialogContent
                showCloseButton={false}
                className="!max-w-none !w-screen !h-screen p-0 gap-0 !rounded-none border-0 top-0 left-0 !translate-x-0 !translate-y-0 overflow-hidden"
            >
                <DialogTitle className="sr-only">Portal Preview</DialogTitle>

                {/* Apply brand color as CSS variable */}
                <style dangerouslySetInnerHTML={{
                    __html: `
                        .preview-portal {
                            --primary: hsl(${primaryHSL});
                            --ring: hsl(${primaryHSL});
                        }
                        .preview-portal .portal-gradient-bg {
                            background: ${gradientCSS};
                        }
                    `
                }} />

                {/* Exact Portal Layout - Matching portal/(portal)/layout.tsx */}
                <div className="preview-portal flex flex-col h-full portal-gradient-bg selection:bg-primary/10 overflow-hidden">
                    {/* Header with Logo + Navigation + Contact */}
                    <header className="bg-white border-b sticky top-0 z-10 shadow-sm flex-shrink-0">
                        <div className="max-w-7xl mx-auto">
                            <div className="grid grid-cols-3 items-center px-6 h-16 gap-4">
                                {/* Left: Logo + Project Name */}
                                <div className="flex items-center gap-3 shrink-0">
                                    {loading ? (
                                        <div className="h-7 w-24 bg-muted animate-pulse rounded" />
                                    ) : branding?.logoUrl ? (
                                        <Image
                                            src={branding.logoUrl}
                                            alt={project?.organization?.name || 'Logo'}
                                            width={100}
                                            height={32}
                                            className="object-contain h-7 w-auto"
                                        />
                                    ) : (
                                        <div className="font-bold text-base">
                                            {project?.organization?.name || 'Portal'}
                                        </div>
                                    )}
                                    <div className="h-5 w-px bg-border" />
                                    <h1 className="text-sm font-semibold text-foreground whitespace-nowrap">
                                        {project?.name || projectName}
                                    </h1>
                                </div>

                                {/* Center: Navigation Tabs */}
                                <div className="flex justify-center">
                                    <nav className="overflow-x-auto scrollbar-hide">
                                        <div className="flex gap-1 min-w-max">
                                            {/* Overview Tab */}
                                            <button
                                                onClick={handleOverviewClick}
                                                className={cn(
                                                    "flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors rounded-md whitespace-nowrap",
                                                    showOverview
                                                        ? "text-primary bg-primary/10"
                                                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                                )}
                                            >
                                                <LayoutDashboard className="size-4 shrink-0" />
                                                <span>Overview</span>
                                            </button>

                                            {/* Page Tabs */}
                                            {pages.map((page) => {
                                                const isActive = selectedPage?.id === page.id

                                                return (
                                                    <button
                                                        key={page.id}
                                                        onClick={() => handlePageClick(page)}
                                                        className={cn(
                                                            "flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors rounded-md whitespace-nowrap",
                                                            isActive
                                                                ? "text-primary bg-primary/10"
                                                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                                        )}
                                                    >
                                                        <FileText className="size-4 shrink-0" />
                                                        <span>{page.title}</span>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </nav>
                                </div>

                                {/* Right: Preview Badge + Contact Button + Close */}
                                <div className="flex items-center justify-end gap-3">
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-amber-50 text-[11px] font-medium text-amber-700">
                                        <Eye className="size-3" />
                                        Preview Mode
                                    </div>
                                    <button
                                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors whitespace-nowrap pointer-events-none opacity-75"
                                    >
                                        Contact us
                                    </button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setOpen(false)}
                                        className="size-8"
                                    >
                                        <X className="size-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </header>

                    {/* Content Area - Full Width */}
                    <main className="flex-1 overflow-y-auto">
                        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-20">
                                    <Loader2 className="size-8 animate-spin text-muted-foreground mb-4" />
                                    <p className="text-sm text-muted-foreground">Loading portal...</p>
                                </div>
                            ) : showOverview ? (
                                /* Overview Page */
                                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                                    <div className="text-center py-20">
                                        <LayoutDashboard className="size-12 text-muted-foreground/50 mx-auto mb-4" />
                                        <h2 className="text-xl font-semibold text-foreground mb-2">
                                            Overview
                                        </h2>
                                        <p className="text-muted-foreground max-w-md mx-auto">
                                            This is the overview page. Select a page from the navigation to preview its content.
                                        </p>
                                    </div>
                                </div>
                            ) : selectedPage ? (
                                /* Page Content */
                                <PortalProvider projectId={projectId}>
                                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                                        {blocksLoading ? (
                                            <div className="flex flex-col items-center justify-center py-20">
                                                <Loader2 className="size-8 animate-spin text-muted-foreground mb-4" />
                                                <p className="text-sm text-muted-foreground">Loading content...</p>
                                            </div>
                                        ) : blocks.length === 0 ? (
                                            <div className="text-center py-20 text-muted-foreground">
                                                <FileText className="size-12 text-muted-foreground/50 mx-auto mb-4" />
                                                <p className="text-sm">No content on this page yet</p>
                                            </div>
                                        ) : (
                                            <div>
                                                {blocks.map((block) => (
                                                    <div key={block.id} className="pointer-events-none">
                                                        <PortalBlockRenderer block={block} />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </PortalProvider>
                            ) : null}
                        </div>
                    </main>
                </div>
            </DialogContent>
        </Dialog>
    )
}
