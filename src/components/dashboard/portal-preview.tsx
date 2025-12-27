'use client'

import { useState, useEffect } from 'react'
import { Eye, X, Shield, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog'
import { PortalSidebar } from '@/components/portal/portal-sidebar'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
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

export function PortalPreview({ projectId, projectName }: PortalPreviewProps) {
    const [open, setOpen] = useState(false)
    const [project, setProject] = useState<Project | null>(null)
    const [pages, setPages] = useState<Page[]>([])
    const [selectedPage, setSelectedPage] = useState<Page | null>(null)
    const [blocks, setBlocks] = useState<Block[]>([])
    const [loading, setLoading] = useState(false)
    const [blocksLoading, setBlocksLoading] = useState(false)

    // Fetch project and pages when preview opens
    useEffect(() => {
        if (open && pages.length === 0) {
            fetchProjectData()
        }
    }, [open])

    // Fetch blocks when page is selected
    useEffect(() => {
        if (selectedPage) {
            fetchBlocks(selectedPage.id)
        }
    }, [selectedPage])

    const fetchProjectData = async () => {
        setLoading(true)
        try {
            const { getProject } = await import('@/app/dashboard/projects/actions')
            const { getPages } = await import('@/app/dashboard/projects/[projectId]/pages-actions')

            const [projectData, pagesData] = await Promise.all([
                getProject(projectId),
                getPages(projectId)
            ])

            if (projectData) {
                setProject(projectData as Project)
            }
            setPages(pagesData as Page[])
            if (pagesData && pagesData.length > 0) {
                setSelectedPage(pagesData[0] as Page)
            }
        } catch (error) {
            console.error('Error fetching project data:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchBlocks = async (pageId: string) => {
        setBlocksLoading(true)
        try {
            const { getBlocks } = await import('@/app/dashboard/projects/[projectId]/block-actions')
            const blocksData = await getBlocks(pageId)
            setBlocks(blocksData as Block[])
        } catch (error) {
            console.error('Error fetching blocks:', error)
        } finally {
            setBlocksLoading(false)
        }
    }

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
                <VisuallyHidden>
                    <DialogTitle>Portal Preview</DialogTitle>
                </VisuallyHidden>
                {/* Exact Portal Layout */}
                <div className="flex h-full bg-muted/10 selection:bg-primary/10 overflow-hidden">
                    {/* Sidebar */}
                    <aside className="w-72 bg-white border-r flex-shrink-0 overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 className="size-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <nav className="flex flex-col h-full">
                                <div className="p-4 border-b">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">
                                        Navigering
                                    </p>
                                    <div className="space-y-1">
                                        {pages.map((page) => {
                                            const isActive = selectedPage?.id === page.id
                                            return (
                                                <button
                                                    key={page.id}
                                                    onClick={() => setSelectedPage(page)}
                                                    className={cn(
                                                        "w-full group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                                                        isActive
                                                            ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                                                            : "text-muted-foreground hover:bg-muted font-normal"
                                                    )}
                                                >
                                                    <span className="flex-1 truncate text-left">{page.title}</span>
                                                    {isActive && <span className="size-1.5 rounded-full bg-current" />}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                                <div className="mt-auto p-6 text-center">
                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100 text-[10px] font-bold uppercase tracking-tighter text-amber-700">
                                        <Eye className="size-3" />
                                        Preview Mode
                                    </div>
                                </div>
                            </nav>
                        )}
                    </aside>

                    {/* Main Area */}
                    <div className="flex-1 flex flex-col min-w-0 bg-[#F9FAFB] overflow-hidden">
                        {/* Header */}
                        <header className="h-20 bg-white border-b flex items-center justify-between px-8 z-10 shadow-sm flex-shrink-0">
                            <div className="flex items-center gap-6">
                                {project?.organization?.logo_url ? (
                                    <Image
                                        src={project.organization.logo_url}
                                        alt={project.organization.name}
                                        width={120}
                                        height={40}
                                        className="object-contain h-8 w-auto"
                                    />
                                ) : (
                                    <div className="font-black text-2xl tracking-tighter">
                                        {project?.organization?.name || 'Portal'}
                                    </div>
                                )}
                                <div className="h-6 w-px bg-muted mx-2 hidden sm:block" />
                                <div className="hidden sm:flex flex-col">
                                    <h1 className="text-sm font-bold text-foreground leading-none">{project?.name || projectName}</h1>
                                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mt-1">Implementeringsportal</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-amber-50 text-[11px] font-medium text-amber-700">
                                    <Eye className="size-3" />
                                    Preview Mode
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setOpen(false)}
                                    className="size-8"
                                >
                                    <X className="size-4" />
                                </Button>
                            </div>
                        </header>

                        {/* Content Area */}
                        <main className="flex-1 overflow-y-auto overflow-x-hidden">
                            <PortalProvider projectId={projectId}>
                                <div className="max-w-4xl mx-auto px-8 py-12">
                                    {selectedPage && (
                                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-700">
                                            {blocksLoading ? (
                                                <div className="flex flex-col items-center justify-center py-20">
                                                    <Loader2 className="size-8 animate-spin text-muted-foreground mb-4" />
                                                    <p className="text-sm text-muted-foreground">Laddar innehåll...</p>
                                                </div>
                                            ) : blocks.length === 0 ? (
                                                <div className="text-center py-20 text-muted-foreground">
                                                    <p className="text-sm">Inget innehåll på denna sida än</p>
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
                                    )}
                                </div>
                            </PortalProvider>
                        </main>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
