import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  description?: string
  trend?: {
    value: number
    label: string
  }
  icon?: LucideIcon
  variant?: 'default' | 'success' | 'warning' | 'danger'
  className?: string
  onClick?: () => void
}

export function StatCard({
  title,
  value,
  description,
  trend,
  icon: Icon,
  variant = 'default',
  className,
  onClick
}: StatCardProps) {
  const Component = onClick ? 'button' : 'div'

  // Soft badge colors for trend indicators
  const trendColors = {
    positive: 'bg-emerald-100 text-emerald-600',
    negative: 'bg-red-100 text-red-600',
  }

  return (
    <Component
      onClick={onClick}
      className={cn(
        'group relative flex flex-col justify-between overflow-hidden rounded-lg border bg-card p-5 text-left transition-all',
        onClick
          ? 'hover:border-primary/50 hover:shadow-md cursor-pointer'
          : 'shadow-sm',
        className
      )}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {Icon && (
            <div className={cn(
              'rounded-md p-2',
              variant === 'success' && 'bg-emerald-100 text-emerald-600',
              variant === 'warning' && 'bg-amber-100 text-amber-600',
              variant === 'danger' && 'bg-red-100 text-red-600',
              variant === 'default' && 'bg-blue-100 text-blue-600'
            )}>
              <Icon className="size-4" />
            </div>
          )}
        </div>

        <div className="space-y-0.5">
          <h3 className="text-3xl font-bold tracking-tight text-foreground">{value}</h3>

          <div className="flex items-center gap-2">
            {trend && (
              <span className={cn(
                "inline-flex items-center gap-0.5 px-2.5 py-1 rounded-md text-xs font-medium",
                trend.value > 0 ? trendColors.positive : trendColors.negative
              )}>
                <span>{trend.value > 0 ? '↑' : '↓'}</span>
                <span>{Math.abs(trend.value)}%</span>
              </span>
            )}

            {description && (
              <p className={cn(
                "text-xs text-muted-foreground",
                variant === 'danger' && "text-red-600 font-medium dark:text-red-400"
              )}>
                {description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Subtle indicator bar for actionable items */}
      {onClick && (
        <div className={cn(
          "absolute bottom-0 left-0 h-1 w-full bg-primary/0 transition-all group-hover:bg-primary/50",
          variant === 'danger' && "group-hover:bg-red-500/50"
        )} />
      )}
    </Component>
  )
}
