'use client'

import { Trash2, X, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTableFacetedFilter } from './data-table-faceted-filter'
import { ColumnPicker, type ColumnDefinition } from './column-picker'
import { StatusBadge } from './status-badge'
import { EngagementBadge } from './engagement-badge'
import { TagBadge } from './tag-badge'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import type { ProjectStatus } from '@/app/(app)/projects/[projectId]/status-utils'
import type { DateRange } from './projects-table'

interface DataTableToolbarProps {
  // Filter state
  filter: string
  onFilterChange: (value: string) => void

  selectedTagIds: string[]
  onTagsChange: (tagIds: string[]) => void

  selectedEngagementLevels: string[]
  onEngagementChange: (levels: string[]) => void

  selectedStatuses: string[]
  onStatusesChange: (statuses: string[]) => void

  goLiveDateRange: DateRange | null
  onGoLiveDateRangeChange: (range: DateRange | null) => void

  // Selection
  selectedProjectIds: string[]
  onDelete: () => void

  // Column picker
  columns: ColumnDefinition[]
  visibleColumns: string[]
  columnOrder: string[]
  onVisibilityChange: (columns: string[]) => void
  onOrderChange: (order: string[]) => void
  tableKey: string

  // Available options (from data)
  availableTags: Array<{ id: string; name: string; color: string }>
}

export function DataTableToolbar({
  filter,
  onFilterChange,
  selectedTagIds,
  onTagsChange,
  selectedEngagementLevels,
  onEngagementChange,
  selectedStatuses,
  onStatusesChange,
  goLiveDateRange,
  onGoLiveDateRangeChange,
  selectedProjectIds,
  onDelete,
  columns,
  visibleColumns,
  columnOrder,
  onVisibilityChange,
  onOrderChange,
  tableKey,
  availableTags,
}: DataTableToolbarProps) {
  const isFiltered = filter.length > 0 || selectedTagIds.length > 0 ||
    selectedEngagementLevels.length > 0 || selectedStatuses.length > 0 ||
    goLiveDateRange !== null

  // Status options
  const statusOptions: ProjectStatus[] = ['draft', 'active', 'completed', 'archived']

  // Engagement level options
  const engagementOptions = [
    { label: 'High', value: 'high' },
    { label: 'Medium', value: 'medium' },
    { label: 'Low', value: 'low' },
    { label: 'None', value: 'none' },
  ]

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        <Input
          placeholder="Search projects..."
          value={filter}
          onChange={(e) => onFilterChange(e.target.value)}
          className="h-8 w-[150px] lg:w-[250px]"
        />

        {/* Tags Filter */}
        {availableTags.length > 0 && (
          <DataTableFacetedFilter
            title="Tags"
            options={availableTags.map((tag) => ({
              label: tag.name,
              value: tag.id,
              color: tag.color,
              badge: <TagBadge name={tag.name} color={tag.color} className="pointer-events-none" />,
            }))}
            selectedValues={selectedTagIds}
            onValuesChange={onTagsChange}
          />
        )}

        {/* Status Filter */}
        <DataTableFacetedFilter
          title="Status"
          options={statusOptions.map((status) => ({
            label: status.charAt(0).toUpperCase() + status.slice(1),
            value: status,
            badge: <StatusBadge status={status} className="pointer-events-none" />,
          }))}
          selectedValues={selectedStatuses}
          onValuesChange={onStatusesChange}
        />

        {/* Engagement Filter */}
        <DataTableFacetedFilter
          title="Engagement"
          options={engagementOptions.map((option) => ({
            label: option.label,
            value: option.value,
            badge: (
              <EngagementBadge
                engagement={{
                  score: 0,
                  level: option.value as 'high' | 'medium' | 'low' | 'none',
                  factors: {
                    visits: { score: 0, count: 0 },
                    tasks: { score: 0, completed: 0, total: 0 },
                    questions: { score: 0, answered: 0, total: 0 },
                    files: { score: 0, uploaded: 0, total: 0 },
                    checklists: { score: 0, completed: 0, total: 0 },
                  },
                  calculatedAt: new Date(),
                }}
                showPopover={false}
              />
            ),
          }))}
          selectedValues={selectedEngagementLevels}
          onValuesChange={onEngagementChange}
        />

        {/* Go-Live Date Range Badge */}
        {goLiveDateRange && (
          <Badge variant="secondary" className="gap-1.5 h-8">
            <Calendar className="h-3 w-3" />
            Go-live: {format(goLiveDateRange.from, 'MMM d')} - {format(goLiveDateRange.to, 'MMM d')}
            <X
              className="h-3 w-3 cursor-pointer hover:text-foreground"
              onClick={() => onGoLiveDateRangeChange(null)}
            />
          </Badge>
        )}

        {selectedProjectIds.length > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={onDelete}
            className="h-8"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete ({selectedProjectIds.length})
          </Button>
        )}

        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => {
              onFilterChange('')
              onTagsChange([])
              onEngagementChange([])
              onStatusesChange([])
              onGoLiveDateRangeChange(null)
            }}
            className="h-8 px-2 lg:px-3"
          >
            Reset
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      <ColumnPicker
        columns={columns}
        visibleColumns={visibleColumns}
        columnOrder={columnOrder}
        onVisibilityChange={onVisibilityChange}
        onOrderChange={onOrderChange}
        tableKey={tableKey}
      />
    </div>
  )
}
