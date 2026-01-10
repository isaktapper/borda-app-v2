import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { hexToOKLCH, getLightBackground } from '@/lib/colors'

interface TagBadgeProps {
  name: string
  color: string  // Hex color
  onRemove?: () => void
  className?: string
}

export function TagBadge({ name, color, onRemove, className }: TagBadgeProps) {
  // Convert hex to OKLCH for perceptually uniform colors
  const oklchColor = hexToOKLCH(color)

  // Generate light background (10% opacity) from the OKLCH color
  const bgColor = getLightBackground(oklchColor, 0.15)

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all group',
        onRemove && 'cursor-pointer hover:opacity-80',
        className
      )}
      style={{
        backgroundColor: bgColor,
        color: oklchColor,
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
