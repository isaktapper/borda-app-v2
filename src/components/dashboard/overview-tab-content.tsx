import { getProjectProgress } from '@/app/dashboard/progress-actions'
import { getProjectActionItems } from '@/app/dashboard/projects/[projectId]/action-items-actions'
import { ProgressBar } from './progress-bar'
import { ActionItemsOverview } from './action-items/action-items-overview'
import { Card } from '@/components/ui/card'

interface OverviewTabContentProps {
  projectId: string
  targetGoLive?: string | null
}

export async function OverviewTabContent({ projectId, targetGoLive }: OverviewTabContentProps) {
  const [progress, actionItems] = await Promise.all([
    getProjectProgress(projectId),
    getProjectActionItems(projectId)
  ])

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Projektframsteg</h3>
          <span className="text-3xl font-bold text-primary">
            {progress?.progressPercentage || 0}%
          </span>
        </div>
        <ProgressBar
          value={progress?.progressPercentage || 0}
          size="lg"
          showPercentage={false}
        />
        <div className="grid grid-cols-4 gap-4 pt-4 border-t">
          <div className="text-center">
            <p className="text-2xl font-bold">{progress?.completedTasks || 0}/{progress?.totalTasks || 0}</p>
            <p className="text-xs text-muted-foreground">Uppgifter</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{progress?.answeredQuestions || 0}/{progress?.totalQuestions || 0}</p>
            <p className="text-xs text-muted-foreground">Frågor</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{progress?.completedChecklists || 0}/{progress?.totalChecklists || 0}</p>
            <p className="text-xs text-muted-foreground">Checklistor</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{progress?.uploadedFiles || 0}/{progress?.totalFiles || 0}</p>
            <p className="text-xs text-muted-foreground">Filer</p>
          </div>
        </div>
      </Card>

      {/* Action Items Overview */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Responses</h2>
        <ActionItemsOverview data={actionItems} projectId={projectId} />
      </div>
    </div>
  )
}
