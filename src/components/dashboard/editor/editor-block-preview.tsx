'use client'

import { SharedBlockRenderer } from '@/components/blocks'

interface Block {
    id: string
    type: string
    content: any
    sort_order: number
}

/**
 * EditorBlockPreview - Renders blocks exactly as they appear in the portal
 * but without interactive functionality (read-only preview)
 * 
 * This is a thin wrapper around SharedBlockRenderer that doesn't pass
 * any context, making all blocks non-interactive.
 */
export function EditorBlockPreview({ block }: { block: Block }) {
    return <SharedBlockRenderer block={block} />
}
