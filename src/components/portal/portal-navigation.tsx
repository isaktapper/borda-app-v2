'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, FileText } from 'lucide-react'

interface Page {
    id: string
    title: string
    slug: string
}

interface PortalNavigationProps {
    pages: Page[]
    projectId: string
}

export function PortalNavigation({ pages, projectId }: PortalNavigationProps) {
    const pathname = usePathname()
    const overviewHref = `/portal/${projectId}`
    const isOverviewActive = pathname === overviewHref

    return (
        <nav className="overflow-x-auto scrollbar-hide">
            <div className="flex gap-1 min-w-max">
                {/* Overview Tab */}
                <Link
                    href={overviewHref}
                    className={cn(
                        "flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors rounded-md whitespace-nowrap",
                        isOverviewActive
                            ? "text-primary bg-primary/10"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                >
                    <LayoutDashboard className="size-4 shrink-0" />
                    <span>Overview</span>
                </Link>

                {/* Page Tabs */}
                {pages.map((page) => {
                    const href = `/portal/${projectId}/${page.slug}`
                    const isActive = pathname === href

                    return (
                        <Link
                            key={page.id}
                            href={href}
                            className={cn(
                                "flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors rounded-md whitespace-nowrap",
                                isActive
                                    ? "text-primary bg-primary/10"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            )}
                        >
                            <FileText className="size-4 shrink-0" />
                            <span>{page.title}</span>
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}
