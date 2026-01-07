import { getTags, getTagUsageCounts } from '@/app/(app)/tags/actions'
import { TagsManager } from '@/components/dashboard/tags-manager'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default async function TagsSettingsPage() {
    const [tags, usageCounts] = await Promise.all([
        getTags(),
        getTagUsageCounts()
    ])

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" asChild className="gap-2 -ml-2">
                    <Link href="/settings">
                        <ArrowLeft className="size-4" />
                        Back to settings
                    </Link>
                </Button>
            </div>

            <div className="border-b pb-3">
                <h1 className="text-2xl font-semibold tracking-tight">Tags</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                    Create and manage tags for your projects
                </p>
            </div>

            <TagsManager tags={tags} usageCounts={usageCounts} />
        </div>
    )
}
