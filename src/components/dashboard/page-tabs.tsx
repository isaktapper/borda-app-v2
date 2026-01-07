'use client'

import { useRef, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface Page {
    id: string
    title: string
    slug: string
    sort_order: number
}

interface PageTabsProps {
    pages: Page[]
    selectedPageId: string | null
    onPageSelect: (pageId: string) => void
}

export function PageTabs({ pages, selectedPageId, onPageSelect }: PageTabsProps) {
    const scrollRef = useRef<HTMLDivElement>(null)
    const [showLeftArrow, setShowLeftArrow] = useState(false)
    const [showRightArrow, setShowRightArrow] = useState(false)

    // Sort pages by sort_order
    const sortedPages = [...pages].sort((a, b) => a.sort_order - b.sort_order)

    // Check scroll position to show/hide arrows
    const checkScroll = () => {
        const el = scrollRef.current
        if (!el) return

        setShowLeftArrow(el.scrollLeft > 0)
        setShowRightArrow(el.scrollLeft < el.scrollWidth - el.clientWidth - 1)
    }

    useEffect(() => {
        checkScroll()
        const el = scrollRef.current
        if (el) {
            el.addEventListener('scroll', checkScroll)
            window.addEventListener('resize', checkScroll)
            return () => {
                el.removeEventListener('scroll', checkScroll)
                window.removeEventListener('resize', checkScroll)
            }
        }
    }, [pages])

    // Scroll to selected tab when it changes
    useEffect(() => {
        if (selectedPageId && scrollRef.current) {
            const selectedTab = scrollRef.current.querySelector(`[data-page-id="${selectedPageId}"]`)
            if (selectedTab) {
                selectedTab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
            }
        }
    }, [selectedPageId])

    const scroll = (direction: 'left' | 'right') => {
        const el = scrollRef.current
        if (!el) return
        const scrollAmount = 200
        el.scrollBy({
            left: direction === 'left' ? -scrollAmount : scrollAmount,
            behavior: 'smooth'
        })
    }

    if (pages.length === 0) {
        return null
    }

    return (
        <div className="flex items-center gap-1 max-w-full">
            {/* Left Arrow */}
            {showLeftArrow && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0"
                    onClick={() => scroll('left')}
                >
                    <ChevronLeft className="size-4" />
                </Button>
            )}

            {/* Scrollable Tabs */}
            <div
                ref={scrollRef}
                className="flex items-center gap-1 overflow-x-auto scrollbar-none"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {sortedPages.map((page) => (
                    <button
                        key={page.id}
                        data-page-id={page.id}
                        onClick={() => onPageSelect(page.id)}
                        className={cn(
                            "px-3 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-colors shrink-0",
                            selectedPageId === page.id
                                ? "bg-muted text-foreground"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )}
                    >
                        {page.title}
                    </button>
                ))}
            </div>

            {/* Right Arrow */}
            {showRightArrow && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0"
                    onClick={() => scroll('right')}
                >
                    <ChevronRight className="size-4" />
                </Button>
            )}
        </div>
    )
}

