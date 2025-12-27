'use client'

import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { EngagementScoreResult } from '@/lib/engagement-score'
import { formatDistanceToNow } from 'date-fns'
import { sv } from 'date-fns/locale'

interface EngagementBadgeProps {
  engagement: EngagementScoreResult | null
  showPopover?: boolean
}

export function EngagementBadge({ engagement, showPopover = true }: EngagementBadgeProps) {
  if (!engagement) {
    return (
      <Badge variant="secondary" className="text-xs h-5 !rounded-sm">
        N/A
      </Badge>
    )
  }

  const config = {
    high: {
      label: 'High',
      variant: 'success' as const,
      icon: TrendingUp,
    },
    medium: {
      label: 'Medium',
      variant: 'warning' as const,
      icon: Minus,
    },
    low: {
      label: 'Low',
      variant: 'destructive' as const,
      icon: TrendingDown,
    },
    none: {
      label: 'N/A',
      variant: 'secondary' as const,
      icon: null,
    },
  }

  const { label, variant, icon: Icon } = config[engagement.level]

  const badge = (
    <Badge variant={variant} className="gap-1 text-xs h-5 !rounded-sm">
      {Icon && <Icon className="h-3 w-3" />}
      {label}
    </Badge>
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
              value={engagement.factors.visits.count.toString()}
              score={engagement.factors.visits.score}
              max={20}
            />
            <ScoreRow
              label="Tasks"
              value={`${engagement.factors.tasks.completed}/${engagement.factors.tasks.total}`}
              score={engagement.factors.tasks.score}
              max={25}
            />
            <ScoreRow
              label="Questions"
              value={`${engagement.factors.questions.answered}/${engagement.factors.questions.total}`}
              score={engagement.factors.questions.score}
              max={25}
            />
            <ScoreRow
              label="Files"
              value={`${engagement.factors.files.uploaded}/${engagement.factors.files.total}`}
              score={engagement.factors.files.score}
              max={15}
            />
            <ScoreRow
              label="Checklists"
              value={`${engagement.factors.checklists.completed}/${engagement.factors.checklists.total}`}
              score={engagement.factors.checklists.score}
              max={15}
            />
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              Uppdaterad {formatDistanceToNow(engagement.calculatedAt, { addSuffix: true, locale: sv })}
            </p>
            <p className="text-xs text-muted-foreground">
              Nästa uppdatering: {(() => {
                const nextUpdate = new Date(engagement.calculatedAt.getTime() + 60 * 60 * 1000) // +1 hour
                const now = new Date()
                if (nextUpdate <= now) {
                  return 'vid nästa sidladdning'
                }
                return formatDistanceToNow(nextUpdate, { addSuffix: true, locale: sv })
              })()}
            </p>
          </div>
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
