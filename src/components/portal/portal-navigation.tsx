'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { FileText } from 'lucide-react'

interface Page {
    id: string
    title: string
    slug: string
}

interface PortalNavigationProps {
    pages: Page[]
    spaceId: string
}

export function PortalNavigation({ pages, spaceId }: PortalNavigationProps) {
    const pathname = usePathname()

    return (
        <nav className="overflow-x-auto scrollbar-hide">
            <div className="flex gap-1 min-w-max">
                {/* Page Tabs */}
                {pages.map((page) => {
                    const href = `/space/${spaceId}/shared/${page.slug}`
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
