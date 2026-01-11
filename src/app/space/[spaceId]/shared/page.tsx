import { getPortalPages } from '../../actions'
import { redirect } from 'next/navigation'

// Disable caching so portal always shows latest content
export const dynamic = 'force-dynamic'
export const revalidate = 0

// This page redirects to the first available page
// No more "Overview" page - stakeholders go directly to content
export default async function PortalRedirect({
    params
}: {
    params: Promise<{ spaceId: string }>
}) {
    const { spaceId } = await params
    const pages = await getPortalPages(spaceId)

    // Redirect to first page if available
    if (pages.length > 0) {
        redirect(`/space/${spaceId}/shared/${pages[0].slug}`)
    }

    // If no pages, show empty state
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
            <h2 className="text-xl font-semibold text-foreground mb-2">
                No content yet
            </h2>
            <p className="text-muted-foreground max-w-md">
                This space doesn&apos;t have any pages yet. Please check back later.
            </p>
        </div>
    )
}
