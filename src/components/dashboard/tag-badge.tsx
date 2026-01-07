import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TagBadgeProps {
  name: string
  color: string
  onRemove?: () => void
  className?: string
}

export function TagBadge({ name, color, onRemove, className }: TagBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-xs font-medium h-5 border transition-all group',
        onRemove && 'cursor-pointer hover:shadow-sm',
        className
      )}
      style={{
        backgroundColor: `${color}15`, // Light fill (10-15% opacity)
        borderColor: color,              // Darker border
        color: color,                    // Text color
      }}
    >
      {name}
      {onRemove && (
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onRemove()
          }}
          className="opacity-0 group-hover:opacity-100 hover:bg-black/10 rounded-sm p-0.5 transition-all ml-0.5"
          aria-label={`Remove ${name} tag`}
        >
          <X className="size-3" />
        </button>
      )}
    </span>
  )
}
