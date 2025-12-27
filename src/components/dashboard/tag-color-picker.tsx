'use client'

import { TAG_COLORS } from '@/lib/tag-colors'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TagColorPickerProps {
  selectedColor: string
  onColorSelect: (color: string) => void
  className?: string
}

export function TagColorPicker({ selectedColor, onColorSelect, className }: TagColorPickerProps) {
  return (
    <div className={cn('grid grid-cols-9 gap-2', className)}>
      {TAG_COLORS.map(({ name, value }) => (
        <button
          key={value}
          type="button"
          onClick={() => onColorSelect(value)}
          className="relative size-4 min-w-4 min-h-4 rounded transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 flex-shrink-0"
          style={{ backgroundColor: value }}
          aria-label={`Select ${name} color`}
          title={name}
        >
          {selectedColor === value && (
            <Check className="size-3 absolute inset-0 m-auto text-gray-700 drop-shadow-md" strokeWidth={3} />
          )}
        </button>
      ))}
    </div>
  )
}
