import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface ProgressBarProps {
  value: number
  label?: string
  showPercentage?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function ProgressBar({
  value,
  label,
  showPercentage = true,
  size = 'md',
  className
}: ProgressBarProps) {
  const height = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4'
  }[size]

  const getColor = () => {
    if (value >= 80) return 'bg-emerald-500'
    if (value >= 50) return 'bg-blue-500'
    if (value >= 30) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className={cn('space-y-2', className)}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between text-sm">
          {label && <span className="font-medium text-muted-foreground">{label}</span>}
          {showPercentage && (
            <span className="font-bold text-foreground">{value}%</span>
          )}
        </div>
      )}
      <div className="relative">
        <Progress value={value} className={height} />
        <div
          className={cn('absolute inset-0 rounded-full transition-all', getColor(), height)}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}
