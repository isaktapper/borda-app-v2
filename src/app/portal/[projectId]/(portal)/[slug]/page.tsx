import { getPortalPageWithBlocks, getResponses, getFilesForBlock, getPortalTasks } from '../../../actions'
import { PortalBlockRenderer } from '@/components/portal/block-renderers'
import { notFound } from 'next/navigation'
import { PortalProvider } from '@/components/portal/portal-context'

// Disable caching so portal always shows latest content
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function PortalPage({
    params
}: {
    params: Promise<{ projectId: string; slug: string }>
}) {
    const { projectId, slug } = await params
    const pageData = await getPortalPageWithBlocks(projectId, slug)

    if (!pageData) {
        notFound()
    }

    // Fetch hydration data
    const [responses, taskMap] = await Promise.all([
        getResponses(pageData.id),
        getPortalTasks(projectId, pageData.id)
    ])

    // Fetch files for all file_upload blocks
    const fileUploadBlocks = pageData.blocks.filter((b: any) => b.type === 'file_upload')
    const filesPerBlock: Record<string, any[]> = {}

    for (const block of fileUploadBlocks) {
        filesPerBlock[block.id] = await getFilesForBlock(block.id)
    }

    // Map responses to blockId
    const responseMap: Record<string, any> = {}
    responses.forEach((r: any) => {
        responseMap[r.block_id] = r.value
    })

    return (
        <PortalProvider
            projectId={projectId}
            initialTasks={taskMap}
            initialResponses={responseMap}
            initialFiles={filesPerBlock}
        >
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-700">
                {pageData.blocks.map((block: any) => (
                    <PortalBlockRenderer key={block.id} block={block} />
                ))}
            </div>
        </PortalProvider>
    )
}
