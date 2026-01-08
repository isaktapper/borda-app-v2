'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { FileText, LayoutDashboard } from 'lucide-react'

interface Page {
    id: string
    title: string
    slug: string
}

interface PortalSidebarProps {
    pages: Page[]
    spaceId: string
}

export function PortalSidebar({ pages, spaceId }: PortalSidebarProps) {
    const pathname = usePathname()
    const overviewHref = `/space/${spaceId}/shared`
    const isOverviewActive = pathname === overviewHref

    return (
        <nav className="flex flex-col h-full bg-white border-r">
            <div className="p-4">
                <div className="space-y-1">
                    {/* Overview Link - Always first */}
                    <Link
                        href={overviewHref}
                        className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                            isOverviewActive
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:bg-muted/50"
                        )}
                    >
                        <LayoutDashboard className="size-4 shrink-0" />
                        <span className="flex-1 truncate">Översikt</span>
                    </Link>

                    {/* Custom Pages */}
                    {pages.map((page) => {
                        const href = `/space/${spaceId}/shared/${page.slug}`
                        const isActive = pathname === href

                        return (
                            <Link
                                key={page.id}
                                href={href}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                                    isActive
                                        ? "bg-primary text-primary-foreground"
                                        : "text-muted-foreground hover:bg-muted/50"
                                )}
                            >
                                <FileText className="size-4 shrink-0" />
                                <span className="flex-1 truncate">{page.title}</span>
                            </Link>
                        )
                    })}
                </div>
            </div>
        </nav>
    )
}
