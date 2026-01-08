import { FileText } from 'lucide-react'
import { ActionItemRow } from './action-item-row'
import type { PageWithItems, ActionItem } from '@/app/(app)/spaces/[spaceId]/action-items-actions'

type ActionType = 'task' | 'formField' | 'fileUpload'

interface ActionItemsByPageProps {
  data: PageWithItems[]
  onItemClick: (type: ActionType, item: ActionItem) => void
  spaceId: string
}

export function ActionItemsByPage({ data, onItemClick, spaceId }: ActionItemsByPageProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-12 text-center">
        <p className="text-muted-foreground">
          No action items in this project yet.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {data.map(page => (
        <div key={page.pageId} className="border border-border rounded-lg overflow-hidden">
          {/* Page header */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{page.pageTitle}</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {page.progress.done}/{page.progress.total} done
            </span>
          </div>

          {/* Items */}
          <div className="divide-y divide-border">
            {page.items.map(item => (
              <ActionItemRow
                key={item.id}
                item={item}
                onClick={onItemClick}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
