import { getSpaceProgress } from '@/app/(app)/spaces/progress-actions'
import { getProjectActionItems } from '@/app/(app)/spaces/[spaceId]/action-items-actions'
import { ProgressBar } from './progress-bar'
import { ActionItemsOverview } from './action-items/action-items-overview'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Edit3, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface OverviewTabContentProps {
  spaceId: string
  targetGoLive?: string | null
  hasPages: boolean
}

export async function OverviewTabContent({ spaceId, targetGoLive, hasPages }: OverviewTabContentProps) {
  const [progress, actionItems] = await Promise.all([
    getSpaceProgress(spaceId),
    getProjectActionItems(spaceId)
  ])

  // Show empty state if no pages exist
  if (!hasPages) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md p-8 text-center space-y-4">
          <div className="flex justify-center">
            <div className="rounded-full bg-primary/10 p-4">
              <Edit3 className="size-8 text-primary" />
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Start building your project</h3>
            <p className="text-sm text-muted-foreground">
              Your project has no pages yet. Add some content to get started.
            </p>
          </div>
          <Button asChild className="gap-2">
            <Link href={`?tab=editor`}>
              <Edit3 className="size-4" />
              Go to Editor
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Space progress</h3>
          <span className="text-3xl font-bold text-primary">
            {progress?.progressPercentage || 0}%
          </span>
        </div>
        <ProgressBar
          value={progress?.progressPercentage || 0}
          size="lg"
          showPercentage={false}
        />
        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
          <div className="text-center">
            <p className="text-2xl font-bold">{progress?.completedTasks || 0}/{progress?.totalTasks || 0}</p>
            <p className="text-xs text-muted-foreground">Tasks</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{progress?.answeredForms || 0}/{progress?.totalForms || 0}</p>
            <p className="text-xs text-muted-foreground">Form fields</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{progress?.uploadedFiles || 0}/{progress?.totalFiles || 0}</p>
            <p className="text-xs text-muted-foreground">Files</p>
          </div>
        </div>
      </Card>

      {/* Action Items Overview */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Responses</h2>
        <ActionItemsOverview data={actionItems} spaceId={spaceId} />
      </div>
    </div>
  )
}
