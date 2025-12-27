'use client'

import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { FileText, ChevronRight, LayoutDashboard } from 'lucide-react'

interface Page {
    id: string
    title: string
    slug: string
}

interface PortalSidebarProps {
    pages: Page[]
    projectId: string
}

export function PortalSidebar({ pages, projectId }: PortalSidebarProps) {
    const pathname = usePathname()
    const overviewHref = `/portal/${projectId}`
    const isOverviewActive = pathname === overviewHref

    return (
        <nav className="flex flex-col h-full bg-white border-r">
            <div className="p-4 border-b">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">Navigering</p>
                <div className="space-y-1">
                    {/* Overview Link - Always first */}
                    <Link
                        href={overviewHref}
                        className={cn(
                            "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                            isOverviewActive
                                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                                : "text-muted-foreground hover:bg-muted font-normal"
                        )}
                    >
                        <LayoutDashboard className={cn(
                            "size-4 shrink-0 transition-transform",
                            isOverviewActive ? "scale-110" : "opacity-40 group-hover:opacity-100"
                        )} />
                        <span className="flex-1 truncate">Översikt</span>
                        {isOverviewActive && <ChevronRight className="size-3.5 opacity-50" />}
                    </Link>

                    {/* Custom Pages */}
                    {pages.map((page) => {
                        const href = `/portal/${projectId}/${page.slug}`
                        const isActive = pathname === href

                        return (
                            <Link
                                key={page.id}
                                href={href}
                                className={cn(
                                    "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                                    isActive
                                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                                        : "text-muted-foreground hover:bg-muted font-normal"
                                )}
                            >
                                <FileText className={cn(
                                    "size-4 shrink-0 transition-transform",
                                    isActive ? "scale-110" : "opacity-40 group-hover:opacity-100"
                                )} />
                                <span className="flex-1 truncate">{page.title}</span>
                                {isActive && <ChevronRight className="size-3.5 opacity-50" />}
                            </Link>
                        )
                    })}
                </div>
            </div>

            <div className="mt-auto p-6 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 text-[10px] font-bold uppercase tracking-tighter text-muted-foreground">
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live Portal
                </div>
            </div>
        </nav>
    )
}
