'use client'

import { useState, useEffect } from 'react'
import { Calendar as CalendarIcon, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import type { RelativeDueDate, RelativeDateDirection } from '@/lib/types/templates'

interface RelativeDatePickerProps {
    value?: RelativeDueDate
    onChange: (value: RelativeDueDate | undefined) => void
    className?: string
    /** Compact mode shows just an icon button */
    compact?: boolean
}

export function RelativeDatePicker({
    value,
    onChange,
    className,
    compact = true,
}: RelativeDatePickerProps) {
    const [open, setOpen] = useState(false)
    const [localDays, setLocalDays] = useState<string>(
        value?.days !== undefined ? value.days.toString() : ''
    )
    const [localDirection, setLocalDirection] = useState<RelativeDateDirection>(
        value?.direction || 'after_start'
    )

    // Sync local state when value prop changes
    useEffect(() => {
        if (value) {
            setLocalDays(value.days.toString())
            setLocalDirection(value.direction)
        } else {
            setLocalDays('')
            setLocalDirection('after_start')
        }
    }, [value])

    const handleApply = () => {
        const numValue = parseInt(localDays, 10)
        if (!isNaN(numValue) && numValue >= 0) {
            onChange({ days: numValue, direction: localDirection })
        } else if (localDays === '' || localDays === '0') {
            onChange({ days: 0, direction: localDirection })
        }
        setOpen(false)
    }

    const handleClear = () => {
        onChange(undefined)
        setLocalDays('')
        setOpen(false)
    }

    const getDisplayText = () => {
        if (!value) return null
        if (value.direction === 'after_start') {
            return `+${value.days}d`
        } else {
            return `−${value.days}d`
        }
    }

    const getDisplayTooltip = () => {
        if (!value) return 'Add due date'
        if (value.direction === 'after_start') {
            return `${value.days} days after space is created`
        } else {
            return `${value.days} days before go-live`
        }
    }

    const getHelperText = () => {
        if (localDays === '') return 'Enter number of days'
        const numValue = parseInt(localDays, 10)
        if (isNaN(numValue)) return 'Invalid number'
        
        if (localDirection === 'after_start') {
            return `${numValue} day${numValue !== 1 ? 's' : ''} after space is created`
        } else {
            return `${numValue} day${numValue !== 1 ? 's' : ''} before go-live date`
        }
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                {compact ? (
                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                            'h-7 gap-1',
                            value ? 'px-2' : 'w-7 p-0',
                            !value && 'text-muted-foreground',
                            className
                        )}
                        title={getDisplayTooltip()}
                    >
                        <CalendarIcon className="size-3.5" />
                        {value && (
                            <span className="text-xs font-medium">{getDisplayText()}</span>
                        )}
                    </Button>
                ) : (
                    <Button
                        variant="outline"
                        className={cn(
                            'w-full justify-start text-left font-normal',
                            !value && 'text-muted-foreground',
                            className
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {value ? (
                            <span>{getHelperText()}</span>
                        ) : (
                            <span>Set due date</span>
                        )}
                    </Button>
                )}
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="start">
                <div className="space-y-4">
                    <div className="space-y-1">
                        <Label className="text-sm font-medium">Due Date</Label>
                        <p className="text-xs text-muted-foreground">
                            Set when this task should be due
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Input
                            type="number"
                            min="0"
                            value={localDays}
                            onChange={(e) => setLocalDays(e.target.value)}
                            placeholder="0"
                            className="h-9 w-20 text-center"
                        />
                        <span className="text-sm text-muted-foreground">days</span>
                    </div>

                    <RadioGroup
                        value={localDirection}
                        onValueChange={(v) => setLocalDirection(v as RelativeDateDirection)}
                        className="space-y-2"
                    >
                        <label 
                            className={cn(
                                "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                                localDirection === 'after_start' 
                                    ? "border-primary bg-primary/5" 
                                    : "border-border hover:bg-muted/50"
                            )}
                        >
                            <RadioGroupItem value="after_start" />
                            <div className="flex-1">
                                <p className="text-sm font-medium">After space is created</p>
                                <p className="text-xs text-muted-foreground">For early setup tasks</p>
                            </div>
                        </label>
                        <label 
                            className={cn(
                                "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                                localDirection === 'before_golive' 
                                    ? "border-primary bg-primary/5" 
                                    : "border-border hover:bg-muted/50"
                            )}
                        >
                            <RadioGroupItem value="before_golive" />
                            <div className="flex-1">
                                <p className="text-sm font-medium">Before go-live date</p>
                                <p className="text-xs text-muted-foreground">For deadline-driven tasks</p>
                            </div>
                        </label>
                    </RadioGroup>

                    <p className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1.5">
                        {getHelperText()}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleClear}
                            className="text-muted-foreground hover:text-destructive"
                        >
                            <X className="mr-1 h-3 w-3" />
                            Clear
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={handleApply}
                        >
                            Apply
                        </Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
}
