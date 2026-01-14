'use client'

import { SharedBlockRenderer } from '@/components/blocks'

interface Block {
    id: string
    type: string
    content: any
    sort_order: number
}

interface EditorBlockPreviewProps {
    block: Block
    allBlocks?: Block[]  // All blocks on the page for cross-block references
}

/**
 * EditorBlockPreview - Renders blocks exactly as they appear in the portal
 * but without interactive functionality (read-only preview)
 * 
 * Passes allBlocks through context so blocks like NextTaskBlock can
 * reference other blocks on the page.
 */
export function EditorBlockPreview({ block, allBlocks }: EditorBlockPreviewProps) {
    // Create a minimal context with allBlocks for cross-block references
    const context = allBlocks ? { interactive: false, allBlocks } : undefined
    
    return <SharedBlockRenderer block={block} context={context} />
}
