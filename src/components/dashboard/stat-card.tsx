import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  description?: string
  icon?: LucideIcon
  trend?: {
    value: number
    label: string
  }
  variant?: 'default' | 'success' | 'warning' | 'danger'
  className?: string
  onClick?: () => void
}

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  variant = 'default',
  className,
  onClick
}: StatCardProps) {
  const iconColors = {
    default: 'text-muted-foreground',
    success: 'text-emerald-600 dark:text-emerald-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    danger: 'text-red-600 dark:text-red-400'
  }

  const Component = onClick ? 'button' : 'div'

  return (
    <Component
      onClick={onClick}
      className={cn(
        'p-5 rounded-lg bg-muted/40 transition-colors text-left w-full',
        onClick && 'hover:bg-muted/60 cursor-pointer',
        !onClick && 'hover:bg-muted/50',
        className
      )}
    >
      <div className="space-y-2.5">
        <p className="text-sm text-foreground/90 font-medium">{title}</p>

        <div className="flex items-end justify-between gap-4">
          <div className="space-y-1.5">
            <h3 className="text-3xl font-bold tracking-tight">{value}</h3>
            {trend && (
              <div className="flex items-center gap-1.5">
                <span className={cn(
                  'text-xs font-semibold flex items-center gap-0.5',
                  trend.value > 0 ? 'text-emerald-600' : 'text-red-600'
                )}>
                  {trend.value > 0 ? '↑' : '↓'} {Math.abs(trend.value)}%
                </span>
                <span className="text-xs text-muted-foreground/80">{trend.label}</span>
              </div>
            )}
            {description && (
              <p className="text-xs text-muted-foreground/80">{description}</p>
            )}
          </div>

          {Icon && (
            <div className={cn('p-2.5 rounded-xl bg-primary/10', iconColors[variant])}>
              <Icon className="size-5 flex-shrink-0" />
            </div>
          )}
        </div>
      </div>
    </Component>
  )
}
