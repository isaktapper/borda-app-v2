/**
 * Specialized table cell components for project table
 */

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { formatRelativeTime, daysUntil } from '@/lib/format'
import { format } from 'date-fns'

interface OverdueTasksCellProps {
    count: number
}

export function OverdueTasksCell({ count }: OverdueTasksCellProps) {
    if (count === 0) {
        return <span className="text-muted-foreground">—</span>
    }

    return (
        <Badge variant="destructive" className="!rounded-sm">
            {count}
        </Badge>
    )
}

interface NextDueDateCellProps {
    date: string | null
}

export function NextDueDateCell({ date }: NextDueDateCellProps) {
    if (!date) {
        return <span className="text-muted-foreground">—</span>
    }

    const days = daysUntil(date)
    const isUrgent = days !== null && days <= 3 && days >= 0
    const isOverdue = days !== null && days < 0

    return (
        <span
            className={cn(
                'text-sm',
                isOverdue && 'text-destructive font-medium',
                isUrgent && !isOverdue && 'text-orange-600 font-medium'
            )}
        >
            {format(new Date(date), 'MMM d, yyyy')}
        </span>
    )
}

interface RelativeTimeCellProps {
    date: string | null
    showNever?: boolean
}

export function RelativeTimeCell({ date, showNever = true }: RelativeTimeCellProps) {
    const formatted = formatRelativeTime(date)

    if (!showNever && formatted === 'Never') {
        return <span className="text-muted-foreground">—</span>
    }

    return (
        <span className="text-sm text-muted-foreground">
            {formatted}
        </span>
    )
}

interface VisitsCountCellProps {
    count: number
}

export function VisitsCountCell({ count }: VisitsCountCellProps) {
    if (count === 0) {
        return <span className="text-muted-foreground">—</span>
    }

    return (
        <span className="text-sm font-medium">
            {count}
        </span>
    )
}
