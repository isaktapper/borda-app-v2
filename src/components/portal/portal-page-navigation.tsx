'use client'

import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Page {
    id: string
    title: string
    slug: string
}

interface PortalPageNavigationProps {
    pages: Page[]
    spaceId: string
    currentSlug?: string // undefined means we're on overview
}

export function PortalPageNavigation({ pages, spaceId, currentSlug }: PortalPageNavigationProps) {
    // Create full navigation sequence: overview + pages
    const navigationSequence = [
        { title: 'Overview', slug: null }, // null slug = overview
        ...pages
    ]

    // Find current index
    const currentIndex = currentSlug
        ? navigationSequence.findIndex(p => p.slug === currentSlug)
        : 0 // If no slug provided, we're on overview (index 0)

    // Get previous and next pages
    const previousPage = currentIndex > 0 ? navigationSequence[currentIndex - 1] : null
    const nextPage = currentIndex < navigationSequence.length - 1 ? navigationSequence[currentIndex + 1] : null

    // If no previous or next, don't render anything
    if (!previousPage && !nextPage) {
        return null
    }

    const getHref = (slug: string | null) => {
        return slug ? `/space/${spaceId}/shared/${slug}` : `/space/${spaceId}/shared`
    }

    return (
        <div className="flex items-center justify-between gap-4 pt-8 mt-8 border-t">
            {/* Previous Link */}
            {previousPage ? (
                <Link
                    href={getHref(previousPage.slug)}
                    className={cn(
                        "flex items-center gap-2 px-4 py-3 rounded-lg transition-colors",
                        "bg-white/90 backdrop-blur-sm border hover:border-primary/40",
                        "text-sm font-medium text-muted-foreground hover:text-foreground"
                    )}
                >
                    <ChevronLeft className="size-4" />
                    <div className="text-left">
                        <div className="text-xs text-muted-foreground/60">Previous</div>
                        <div className="font-medium">{previousPage.title}</div>
                    </div>
                </Link>
            ) : (
                <div /> /* Spacer to push next button to the right */
            )}

            {/* Next Link */}
            {nextPage ? (
                <Link
                    href={getHref(nextPage.slug)}
                    className={cn(
                        "flex items-center gap-2 px-4 py-3 rounded-lg transition-colors ml-auto",
                        "bg-white/90 backdrop-blur-sm border hover:border-primary/40",
                        "text-sm font-medium text-muted-foreground hover:text-foreground"
                    )}
                >
                    <div className="text-right">
                        <div className="text-xs text-muted-foreground/60">Next</div>
                        <div className="font-medium">{nextPage.title}</div>
                    </div>
                    <ChevronRight className="size-4" />
                </Link>
            ) : null}
        </div>
    )
}
