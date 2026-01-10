'use client'

import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import type { EngagementScoreResult } from '@/lib/engagement-score'
import { formatDistanceToNow } from 'date-fns'
import { useState } from 'react'

interface EngagementBadgeProps {
  engagement: EngagementScoreResult | null
  showPopover?: boolean
  spaceId?: string
  onRefresh?: () => Promise<void>
}

export function EngagementBadge({ engagement, showPopover = true, spaceId, onRefresh }: EngagementBadgeProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    if (!onRefresh) return
    setIsRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setIsRefreshing(false)
    }
  }

  if (!engagement) {
    return (
      <Badge variant="secondary" className="text-xs">
        N/A
      </Badge>
    )
  }

  // Handle old data structure (migration from questions/checklists to formFields)
  const factors = engagement.factors as any
  const formFields = factors.formFields || factors.questions || { answered: 0, total: 0, score: 0 }

  // Semantic color mapping using CSS variables
  const config = {
    high: {
      label: 'High',
      className: 'bg-success/10 text-success',  // Green
    },
    medium: {
      label: 'Medium',
      className: 'bg-blue-100 text-blue-600',   // Primary blue
    },
    low: {
      label: 'Low',
      className: 'bg-warning/10 text-warning',  // Amber/Orange
    },
    none: {
      label: 'N/A',
      className: 'bg-secondary text-secondary-foreground',  // Grey
    },
  }

  const { label, className } = config[engagement.level]

  const badge = (
    <span
      className={`inline-flex items-center justify-center rounded-md px-2.5 py-1 text-xs font-medium w-fit whitespace-nowrap ${className}`}
    >
      {label}
    </span>
  )

  if (!showPopover) {
    return badge
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="cursor-pointer">
          {badge}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-semibold">Engagement Score</h4>
            <span className="text-2xl font-bold">{engagement.score}</span>
          </div>

          <div className="space-y-2.5">
            <ScoreRow
              label="Visits (14d)"
              value={factors.visits?.count?.toString() || '0'}
              score={factors.visits?.score || 0}
              max={20}
            />
            <ScoreRow
              label="Tasks"
              value={`${factors.tasks?.completed || 0}/${factors.tasks?.total || 0}`}
              score={factors.tasks?.score || 0}
              max={30}
            />
            <ScoreRow
              label="Form Fields"
              value={`${formFields.answered}/${formFields.total}`}
              score={formFields.score}
              max={30}
            />
            <ScoreRow
              label="Files"
              value={`${factors.files?.uploaded || 0}/${factors.files?.total || 0}`}
              score={factors.files?.score || 0}
              max={20}
            />
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              Updated {formatDistanceToNow(engagement.calculatedAt, { addSuffix: true })}
            </p>
            <p className="text-xs text-muted-foreground">
              Next update: {(() => {
                const nextUpdate = new Date(engagement.calculatedAt.getTime() + 60 * 60 * 1000) // +1 hour
                const now = new Date()
                if (nextUpdate <= now) {
                  return 'on next page load'
                }
                return formatDistanceToNow(nextUpdate, { addSuffix: true })
              })()}
            </p>
          </div>

          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh Now'}
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function ScoreRow({
  label,
  value,
  score,
  max,
}: {
  label: string
  value: string | number
  score: number
  max: number
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="w-12 text-right">{value}</span>
        <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${(score / max) * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}
