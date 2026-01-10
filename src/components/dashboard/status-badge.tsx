import { Badge } from '@/components/ui/badge'

type SpaceStatus = 'draft' | 'active' | 'completed' | 'archived'

interface StatusBadgeProps {
  status: SpaceStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const variantMap = {
    draft: 'secondary' as const,
    active: 'default' as const,
    completed: 'success' as const,
    archived: 'secondary' as const,
  }

  const variant = variantMap[status] || 'outline'

  return (
    <Badge
      variant={variant}
      className={`capitalize ${className || ''}`}
    >
      {status}
    </Badge>
  )
}
