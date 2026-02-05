'use client'

import { SharedBlockRenderer, type BlockInteractionContext } from '@/components/blocks'
import { usePortal } from './portal-context'

interface Block {
    id: string
    type: string
    content: any
    page_slug?: string
}

/**
 * PortalBlockRenderer - Wrapper that connects SharedBlockRenderer to the portal context
 *
 * This component bridges the SharedBlockRenderer with the PortalProvider,
 * enabling interactive features like task toggling, form responses, and file uploads.
 */
export function PortalBlockRenderer({ block }: { block: Block }) {
    const portal = usePortal()

    // Build the context object for SharedBlockRenderer
    const context: BlockInteractionContext = {
        interactive: true,
        spaceId: portal.spaceId,
        allBlocks: portal.allBlocks,
        tasks: portal.state.tasks,
        responses: portal.state.responses,
        files: portal.state.files,
        toggleTask: portal.toggleTask,
        updateResponse: portal.updateResponse,
        addFile: portal.addFile,
        removeFile: portal.removeFile,
    }

    return <SharedBlockRenderer block={block} context={context} />
}
