import { getPortalPageWithBlocks, getPortalPages, getResponses, getFilesForBlock, getPortalTasks, getPortalActionPlanBlocks } from '../../../actions'
import { PortalBlockRenderer } from '@/components/portal/block-renderers'
import { notFound } from 'next/navigation'
import { PortalProvider } from '@/components/portal/portal-context'
import { PortalPageNavigation } from '@/components/portal/portal-page-navigation'
import { PageViewLogger } from '@/components/portal/page-view-logger'

// Disable caching so portal always shows latest content
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function PortalPage({
    params
}: {
    params: Promise<{ spaceId: string; slug: string }>
}) {
    const { spaceId, slug } = await params
    const pageData = await getPortalPageWithBlocks(spaceId, slug)

    if (!pageData) {
        notFound()
    }

    // Fetch hydration data and pages list for navigation
    const [responses, taskMap, pages, actionPlanBlocks] = await Promise.all([
        getResponses(pageData.id),
        getPortalTasks(spaceId, pageData.id),
        getPortalPages(spaceId),
        getPortalActionPlanBlocks(spaceId)
    ])

    // Fetch files for all file_upload blocks
    const fileUploadBlocks = pageData.blocks.filter((b: any) => b.type === 'file_upload')
    const filesPerBlock: Record<string, any[]> = {}

    for (const block of fileUploadBlocks) {
        filesPerBlock[block.id] = await getFilesForBlock(block.id)
    }

    // Map responses to blockId or composite keys
    const responseMap: Record<string, any> = {}
    responses.forEach((r: any) => {
        // Check if this is a multi-question block
        if (r.value && r.value.questions) {
            // Expand into composite keys: blockId-questionId
            Object.entries(r.value.questions).forEach(([questionId, value]) => {
                const compositeKey = `${r.block_id}-${questionId}`
                responseMap[compositeKey] = value
            })
        } else {
            // Old format or other block types
            responseMap[r.block_id] = r.value
        }
    })

    return (
        <PortalProvider
            spaceId={spaceId}
            initialTasks={taskMap}
            initialResponses={responseMap}
            initialFiles={filesPerBlock}
            allBlocks={actionPlanBlocks}
        >
            {/* Log page view */}
            <PageViewLogger 
                spaceId={spaceId} 
                pageId={pageData.id} 
                pageName={pageData.title} 
            />
            
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-700">
                {pageData.blocks.map((block: any) => (
                    <PortalBlockRenderer key={block.id} block={block} />
                ))}

                {/* Page Navigation */}
                <PortalPageNavigation
                    pages={pages}
                    spaceId={spaceId}
                    currentSlug={slug}
                />
            </div>
        </PortalProvider>
    )
}
