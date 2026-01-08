'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { Columns3, GripVertical } from 'lucide-react'
import { updateTablePreferences, type TablePreferences } from '@/app/(app)/spaces/table-actions'
import { cn } from '@/lib/utils'

export interface ColumnDefinition {
    id: string
    label: string
    defaultVisible: boolean
}

interface ColumnPickerProps {
    columns: ColumnDefinition[]
    visibleColumns: string[]
    columnOrder: string[]
    onVisibilityChange: (visible: string[]) => void
    onOrderChange: (order: string[]) => void
    tableKey: string
}

export function ColumnPicker({
    columns,
    visibleColumns,
    columnOrder,
    onVisibilityChange,
    onOrderChange,
    tableKey
}: ColumnPickerProps) {
    const [open, setOpen] = useState(false)
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
    const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null)

    // Get ordered columns
    const orderedColumns = columnOrder
        .map(id => columns.find(col => col.id === id))
        .filter(Boolean) as ColumnDefinition[]

    // Debounced save to database
    const savePreferences = useCallback((visible: string[], order: string[]) => {
        // Clear existing timeout
        if (saveTimeout) {
            clearTimeout(saveTimeout)
        }

        // Set new timeout
        const timeout = setTimeout(async () => {
            const prefs: TablePreferences = {
                visible_columns: visible,
                column_order: order
            }
            await updateTablePreferences(tableKey, prefs)
        }, 500)

        setSaveTimeout(timeout)
    }, [saveTimeout, tableKey])

    const handleToggle = (columnId: string) => {
        const newVisible = visibleColumns.includes(columnId)
            ? visibleColumns.filter(id => id !== columnId)
            : [...visibleColumns, columnId]

        onVisibilityChange(newVisible)
        savePreferences(newVisible, columnOrder)
    }

    const handleReset = () => {
        const defaultVisible = columns
            .filter(col => col.defaultVisible)
            .map(col => col.id)
        const defaultOrder = columns.map(col => col.id)

        onVisibilityChange(defaultVisible)
        onOrderChange(defaultOrder)
        savePreferences(defaultVisible, defaultOrder)
    }

    const handleDragStart = (index: number) => {
        setDraggedIndex(index)
    }

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault()

        if (draggedIndex === null || draggedIndex === index) return

        const newOrder = [...columnOrder]
        const draggedItem = newOrder[draggedIndex]
        newOrder.splice(draggedIndex, 1)
        newOrder.splice(index, 0, draggedItem)

        onOrderChange(newOrder)
        setDraggedIndex(index)
    }

    const handleDragEnd = () => {
        setDraggedIndex(null)
        savePreferences(visibleColumns, columnOrder)
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Columns3 className="size-4" />
                    Columns
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">Customize Columns</h4>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleReset}
                            className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                        >
                            Reset to default
                        </Button>
                    </div>

                    <div className="space-y-1 max-h-[280px] overflow-y-auto pr-1">
                        {orderedColumns.map((column, index) => (
                            <div
                                key={column.id}
                                draggable
                                onDragStart={() => handleDragStart(index)}
                                onDragOver={(e) => handleDragOver(e, index)}
                                onDragEnd={handleDragEnd}
                                className={cn(
                                    'flex items-center gap-2 rounded-md px-2 py-1.5 cursor-move hover:bg-muted/50 transition-colors',
                                    draggedIndex === index && 'opacity-50'
                                )}
                            >
                                <GripVertical className="size-3.5 text-muted-foreground" />
                                <span className="flex-1 text-sm">{column.label}</span>
                                <Switch
                                    checked={visibleColumns.includes(column.id)}
                                    onCheckedChange={() => handleToggle(column.id)}
                                />
                            </div>
                        ))}
                    </div>

                    <div className="text-xs text-muted-foreground pt-2 border-t">
                        Drag to reorder • Toggle to show/hide
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
}
