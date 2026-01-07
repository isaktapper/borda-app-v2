import { getTags, getTagUsageCounts } from '@/app/(app)/tags/actions'
import { TagsManager } from '@/components/dashboard/tags-manager'

export async function TagsSection() {
  const [tags, usageCounts] = await Promise.all([
    getTags(),
    getTagUsageCounts()
  ])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Tags</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Create and manage tags for your projects
        </p>
      </div>

      <TagsManager tags={tags} usageCounts={usageCounts} />
    </div>
  )
}
