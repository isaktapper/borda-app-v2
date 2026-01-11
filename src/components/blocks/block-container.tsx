'use client'

import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface BlockContainerProps {
    children: ReactNode
    className?: string
    /** Optional title displayed at the top of the block */
    title?: string
    /** Optional description displayed below the title */
    description?: string
    /** Whether to apply padding - some blocks like embed may want custom padding */
    noPadding?: boolean
}

/**
 * BlockContainer - Unified wrapper for all block types
 * 
 * Design specs:
 * - White background (bg-white)
 * - No border
 * - No shadow
 * - rounded-lg
 * - Consistent padding (p-5)
 */
export function BlockContainer({
    children,
    className,
    title,
    description,
    noPadding = false,
}: BlockContainerProps) {
    return (
        <div
            className={cn(
                'bg-white rounded-lg',
                !noPadding && 'p-5',
                className
            )}
        >
            {(title || description) && (
                <div className="mb-4">
                    {title && (
                        <h3 className="text-lg font-semibold text-foreground">
                            {title}
                        </h3>
                    )}
                    {description && (
                        <p className="text-sm text-muted-foreground mt-1">
                            {description}
                        </p>
                    )}
                </div>
            )}
            {children}
        </div>
    )
}

/**
 * BlockHeader - Standalone header component for blocks that need custom layouts
 */
export function BlockHeader({
    title,
    description,
    className,
}: {
    title?: string
    description?: string
    className?: string
}) {
    if (!title && !description) return null

    return (
        <div className={cn('mb-4', className)}>
            {title && (
                <h3 className="text-lg font-semibold text-foreground">
                    {title}
                </h3>
            )}
            {description && (
                <p className="text-sm text-muted-foreground mt-1">
                    {description}
                </p>
            )}
        </div>
    )
}
