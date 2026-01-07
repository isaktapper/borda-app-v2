"use client"

import { useState, useMemo, useEffect, forwardRef, useImperativeHandle } from "react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import Link from "next/link"
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ColumnPicker, type ColumnDefinition } from "./column-picker"
import { getTablePreferences } from "@/app/(app)/projects/table-actions"
import {
    OverdueTasksCell,
    NextDueDateCell,
    RelativeTimeCell,
    VisitsCountCell
} from "./table-cells"
import { TagBadge } from "./tag-badge"
import { EngagementBadge } from "./engagement-badge"
import { StatusBadge } from "./status-badge"
import { DataTableToolbar } from "./data-table-toolbar"
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination"
import type { EngagementScoreResult } from "@/lib/engagement-score"
import type { ProjectStatus } from "@/app/(app)/projects/[projectId]/status-utils"

export interface DateRange {
    from: Date
    to: Date
}

type Project = {
    id: string
    client_name: string
    client_logo_url: string | null
    name: string
    status: string
    target_go_live_date: string | null
    created_at: string
    assigned_to: string | null
    assigned_user?: {
        id: string
        email: string
        full_name: string | null
        avatar_url: string | null
    } | null
    progress: number
    template_name: string | null
    last_activity_at: string | null
    overdue_tasks_count: number
    next_due_date: string | null
    last_visit_at: string | null
    visits_count: number
    tags: Array<{ id: string; name: string; color: string }>
    engagement_score: number | null
    engagement_level: 'high' | 'medium' | 'low' | 'none' | null
    engagement_calculated_at: string | null
}

type SortField = keyof Project | 'assigned_to'
type SortOrder = 'asc' | 'desc' | null

interface ProjectsTableProps {
    projects: Project[]
}

export interface ProjectsTableRef {
    setEngagementFilter: (levels: string[]) => void
    setGoLiveDateRange: (range: DateRange | null) => void
}

// Define all available columns
const COLUMNS: ColumnDefinition[] = [
    { id: 'id', label: 'ID', defaultVisible: false },
    { id: 'client_name', label: 'Customer', defaultVisible: true },
    { id: 'name', label: 'Project Name', defaultVisible: true },
    { id: 'status', label: 'Status', defaultVisible: true },
    { id: 'tags', label: 'Tags', defaultVisible: true },
    { id: 'progress', label: 'Progress', defaultVisible: true },
    { id: 'engagement_level', label: 'Engagement', defaultVisible: true },
    { id: 'target_go_live_date', label: 'Go-Live', defaultVisible: true },
    { id: 'assigned_to', label: 'Assigned To', defaultVisible: true },
    { id: 'last_activity_at', label: 'Last Activity', defaultVisible: true },
    { id: 'overdue_tasks_count', label: 'Overdue Tasks', defaultVisible: false },
    { id: 'next_due_date', label: 'Next Due Date', defaultVisible: false },
    { id: 'template_name', label: 'Template', defaultVisible: false },
    { id: 'last_visit_at', label: 'Last Visit', defaultVisible: false },
    { id: 'visits_count', label: 'Visits', defaultVisible: false },
    { id: 'created_at', label: 'Created', defaultVisible: true },
]

const DEFAULT_VISIBLE = COLUMNS.filter(col => col.defaultVisible).map(col => col.id)
const DEFAULT_ORDER = COLUMNS.map(col => col.id)

export const ProjectsTable = forwardRef<ProjectsTableRef, ProjectsTableProps>(({ projects }, ref) => {
    const [sortField, setSortField] = useState<SortField | null>(null)
    const [sortOrder, setSortOrder] = useState<SortOrder>(null)
    const [filter, setFilter] = useState("")
    const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
    const [selectedEngagementLevels, setSelectedEngagementLevels] = useState<string[]>([])
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
    const [goLiveDateRange, setGoLiveDateRange] = useState<DateRange | null>(null)
    const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([])
    const [visibleColumns, setVisibleColumns] = useState<string[]>(DEFAULT_VISIBLE)
    const [columnOrder, setColumnOrder] = useState<string[]>(DEFAULT_ORDER)
    const [prefsLoaded, setPrefsLoaded] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage] = useState(10)

    // Expose methods to parent component
    useImperativeHandle(ref, () => ({
        setEngagementFilter: (levels: string[]) => {
            setSelectedEngagementLevels(levels)
        },
        setGoLiveDateRange: (range: DateRange | null) => {
            setGoLiveDateRange(range)
        }
    }))

    // Load user preferences on mount
    useEffect(() => {
        const loadPrefs = async () => {
            const prefs = await getTablePreferences('projects_table')
            if (prefs) {
                // Merge saved preferences with new columns that have defaultVisible: true
                const defaultVisibleIds = COLUMNS.filter(col => col.defaultVisible).map(col => col.id)
                const allColumnIds = COLUMNS.map(col => col.id)

                // Add any new default columns that aren't already in visible columns
                const updatedVisible = [...new Set([...prefs.visible_columns, ...defaultVisibleIds.filter(id => !prefs.visible_columns.includes(id))])]

                // Add any new columns to the order that aren't already there
                const updatedOrder = [...prefs.column_order, ...allColumnIds.filter(id => !prefs.column_order.includes(id))]

                setVisibleColumns(updatedVisible)
                setColumnOrder(updatedOrder)
            } else {
                setVisibleColumns(DEFAULT_VISIBLE)
                setColumnOrder(DEFAULT_ORDER)
            }
            setPrefsLoaded(true)
        }
        loadPrefs()
    }, [])

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : sortOrder === 'desc' ? null : 'asc')
            if (sortOrder === 'desc') setSortField(null)
        } else {
            setSortField(field)
            setSortOrder('asc')
        }
    }

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedProjectIds(paginatedProjects.map(p => p.id))
        } else {
            setSelectedProjectIds([])
        }
    }

    const handleSelectProject = (projectId: string, checked: boolean) => {
        if (checked) {
            setSelectedProjectIds([...selectedProjectIds, projectId])
        } else {
            setSelectedProjectIds(selectedProjectIds.filter(id => id !== projectId))
        }
    }

    const handleDelete = async () => {
        if (selectedProjectIds.length === 0) return

        const confirmed = confirm(`Are you sure you want to delete ${selectedProjectIds.length} projekt?`)
        if (!confirmed) return

        const { deleteProjects } = await import('@/app/(app)/projects/actions')
        const result = await deleteProjects(selectedProjectIds)

        if (result.error) {
            alert('Fel vid borttagning: ' + result.error)
        } else {
            setSelectedProjectIds([])
        }
    }

    const sortedAndFilteredProjects = useMemo(() => {
        let result = [...projects]

        // Filter by text
        if (filter) {
            result = result.filter(project => {
                const assignedName = project.assigned_user?.full_name || project.assigned_user?.email || ''
                return project.id.toLowerCase().includes(filter.toLowerCase()) ||
                    project.client_name.toLowerCase().includes(filter.toLowerCase()) ||
                    project.name.toLowerCase().includes(filter.toLowerCase()) ||
                    project.status.toLowerCase().includes(filter.toLowerCase()) ||
                    assignedName.toLowerCase().includes(filter.toLowerCase())
            })
        }

        // Filter by tags (OR logic - project must have at least one selected tag)
        if (selectedTagIds.length > 0) {
            result = result.filter(project =>
                project.tags.some(tag => selectedTagIds.includes(tag.id))
            )
        }

        // Filter by engagement level (OR logic - project must match at least one selected level)
        if (selectedEngagementLevels.length > 0) {
            result = result.filter(project => {
                const level = project.engagement_level || 'none'
                return selectedEngagementLevels.includes(level)
            })
        }

        // Filter by status (OR logic - project must match at least one selected status)
        if (selectedStatuses.length > 0) {
            result = result.filter(project => {
                return selectedStatuses.includes(project.status)
            })
        }

        // Filter by go-live date range
        if (goLiveDateRange) {
            result = result.filter(project => {
                if (!project.target_go_live_date) return false
                const goLiveDate = new Date(project.target_go_live_date)
                return goLiveDate >= goLiveDateRange.from && goLiveDate <= goLiveDateRange.to
            })
        }

        // Sort
        if (sortField && sortOrder) {
            result.sort((a, b) => {
                let aVal: any
                let bVal: any

                if (sortField === 'assigned_to') {
                    aVal = a.assigned_user?.full_name || a.assigned_user?.email || ''
                    bVal = b.assigned_user?.full_name || b.assigned_user?.email || ''
                } else if (sortField === 'tags') {
                    // Sort by number of tags
                    aVal = a.tags.length
                    bVal = b.tags.length
                } else if (sortField === 'engagement_level') {
                    // Sort by engagement score (numeric) instead of level (string)
                    aVal = a.engagement_score ?? -1
                    bVal = b.engagement_score ?? -1
                } else {
                    aVal = a[sortField as keyof Project]
                    bVal = b[sortField as keyof Project]
                }

                if (aVal === null || aVal === '') return 1
                if (bVal === null || bVal === '') return -1

                if (typeof aVal === 'string') aVal = aVal.toLowerCase()
                if (typeof bVal === 'string') bVal = bVal.toLowerCase()

                if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
                if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
                return 0
            })
        }

        return result
    }, [projects, filter, selectedTagIds, selectedEngagementLevels, selectedStatuses, sortField, sortOrder, goLiveDateRange])

    // Calculate pagination
    const totalPages = Math.ceil(sortedAndFilteredProjects.length / itemsPerPage)

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1)
    }, [filter, selectedTagIds, selectedEngagementLevels, selectedStatuses, goLiveDateRange])

    const paginatedProjects = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage
        const endIndex = startIndex + itemsPerPage
        return sortedAndFilteredProjects.slice(startIndex, endIndex)
    }, [sortedAndFilteredProjects, currentPage, itemsPerPage])

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) {
            return <ArrowUpDown className="size-3.5 text-muted-foreground/40" />
        }
        return sortOrder === 'asc' ? (
            <ArrowUp className="size-3.5 text-foreground" />
        ) : (
            <ArrowDown className="size-3.5 text-foreground" />
        )
    }

    const renderCell = (project: Project, columnId: string) => {
        switch (columnId) {
            case 'id':
                return <span className="font-mono text-xs">{project.id}</span>
            case 'client_name':
                return (
                    <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                            {project.client_logo_url && (
                                <AvatarImage src={project.client_logo_url} className="object-contain" />
                            )}
                            <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                                {project.client_name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-sm">{project.client_name}</span>
                    </div>
                )
            case 'name':
                return <span className="text-sm">{project.name}</span>
            case 'status':
                return <StatusBadge status={project.status as ProjectStatus} />
            case 'tags':
                const visibleTags = project.tags.slice(0, 3)
                const remainingCount = project.tags.length - 3

                return (
                    <div className="flex items-center gap-1">
                        {visibleTags.length === 0 ? (
                            <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                            <>
                                {visibleTags.map(tag => (
                                    <TagBadge key={tag.id} name={tag.name} color={tag.color} />
                                ))}
                                {remainingCount > 0 && (
                                    <span className="text-xs text-muted-foreground px-1.5 py-0.5 rounded-md bg-muted">
                                        +{remainingCount}
                                    </span>
                                )}
                            </>
                        )}
                    </div>
                )
            case 'progress':
                return (
                    <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary transition-all duration-300"
                                style={{ width: `${project.progress}%` }}
                            />
                        </div>
                        <span className="text-xs text-muted-foreground font-mono w-8 text-right">
                            {project.progress}%
                        </span>
                    </div>
                )
            case 'engagement_level':
                const engagement: EngagementScoreResult | null =
                    project.engagement_score !== null &&
                    project.engagement_level !== null &&
                    project.engagement_calculated_at !== null
                        ? {
                            score: project.engagement_score,
                            level: project.engagement_level,
                            factors: {
                                visits: { score: 0, count: 0 },
                                tasks: { score: 0, completed: 0, total: 0 },
                                questions: { score: 0, answered: 0, total: 0 },
                                files: { score: 0, uploaded: 0, total: 0 },
                                checklists: { score: 0, completed: 0, total: 0 }
                            },
                            calculatedAt: new Date(project.engagement_calculated_at)
                        }
                        : null

                return <EngagementBadge engagement={engagement} showPopover={false} />
            case 'target_go_live_date':
                return (
                    <span className="text-sm">
                        {project.target_go_live_date
                            ? format(new Date(project.target_go_live_date), 'MMM d, yyyy')
                            : '—'
                        }
                    </span>
                )
            case 'assigned_to':
                return project.assigned_user ? (
                    <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                            <AvatarImage src={project.assigned_user.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                {(project.assigned_user.full_name || project.assigned_user.email || 'U').charAt(0).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{project.assigned_user.full_name || project.assigned_user.email || 'Unassigned'}</span>
                    </div>
                ) : <span className="text-muted-foreground">—</span>
            case 'last_activity_at':
                return <RelativeTimeCell date={project.last_activity_at} />
            case 'overdue_tasks_count':
                return <OverdueTasksCell count={project.overdue_tasks_count} />
            case 'next_due_date':
                return <NextDueDateCell date={project.next_due_date} />
            case 'template_name':
                return <span className="text-sm">{project.template_name || '—'}</span>
            case 'last_visit_at':
                return <RelativeTimeCell date={project.last_visit_at} />
            case 'visits_count':
                return <VisitsCountCell count={project.visits_count} />
            case 'created_at':
                return <span className="text-xs text-muted-foreground">{format(new Date(project.created_at), 'MMM d, yyyy')}</span>
            default:
                return null
        }
    }

    const renderHeader = (columnId: string) => {
        const column = COLUMNS.find(col => col.id === columnId)
        if (!column) return null

        const isSortable = true // All columns are now sortable

        if (!isSortable) {
            return (
                <div className="h-7 px-2 text-xs font-medium flex items-center">
                    {column.label.toUpperCase()}
                </div>
            )
        }

        return (
            <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort(columnId as SortField)}
                className="h-7 px-3 text-xs font-medium hover:bg-transparent gap-1.5 justify-start -mx-3"
            >
                {column.label.toUpperCase()}
                <SortIcon field={columnId as SortField} />
            </Button>
        )
    }

    // Don't render until prefs are loaded to avoid layout shift
    if (!prefsLoaded) {
        return <div className="h-96 animate-pulse bg-muted/20 rounded-xl" />
    }

    const orderedVisibleColumns = columnOrder.filter(id => visibleColumns.includes(id))

    // Extract unique tags from all projects
    const availableTags = Array.from(
        new Map(
            projects.flatMap(p => p.tags).map(tag => [tag.id, tag])
        ).values()
    )

    return (
        <div className="space-y-3 max-w-full overflow-hidden">
            <DataTableToolbar
                filter={filter}
                onFilterChange={setFilter}
                selectedTagIds={selectedTagIds}
                onTagsChange={setSelectedTagIds}
                selectedEngagementLevels={selectedEngagementLevels}
                onEngagementChange={setSelectedEngagementLevels}
                selectedStatuses={selectedStatuses}
                onStatusesChange={setSelectedStatuses}
                goLiveDateRange={goLiveDateRange}
                onGoLiveDateRangeChange={setGoLiveDateRange}
                selectedProjectIds={selectedProjectIds}
                onDelete={handleDelete}
                columns={COLUMNS}
                visibleColumns={visibleColumns}
                columnOrder={columnOrder}
                onVisibilityChange={setVisibleColumns}
                onOrderChange={setColumnOrder}
                tableKey="projects_table"
                availableTags={availableTags}
            />

            <div className="w-full overflow-x-auto">
                <div className="bg-card/80 backdrop-blur-xl rounded-xl shadow-lg shadow-black/5 border border-border/50">
                    <Table className="w-max min-w-full">
                    <TableHeader>
                        <TableRow className="border-b hover:bg-transparent">
                            <TableHead className="h-10 w-12 px-3">
                                <Checkbox
                                    checked={paginatedProjects.length > 0 && paginatedProjects.every(p => selectedProjectIds.includes(p.id))}
                                    onCheckedChange={handleSelectAll}
                                    aria-label="Select all"
                                />
                            </TableHead>
                            {orderedVisibleColumns.map(columnId => (
                                <TableHead key={columnId} className={`h-10 px-3 whitespace-nowrap text-left ${columnId === 'created_at' ? 'text-right' : ''}`}>
                                    {renderHeader(columnId)}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedProjects.map((project) => (
                            <TableRow key={project.id} className="hover:bg-muted/5 border-b last:border-0">
                                <TableCell className="w-12 px-3">
                                    <Checkbox
                                        checked={selectedProjectIds.includes(project.id)}
                                        onCheckedChange={(checked) => handleSelectProject(project.id, checked as boolean)}
                                        aria-label={`Select ${project.client_name}`}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </TableCell>
                                {orderedVisibleColumns.map(columnId => (
                                    <TableCell key={columnId} className={`p-0 whitespace-nowrap text-left ${columnId === 'created_at' ? 'text-right' : ''}`}>
                                        <Link href={`/projects/${project.id}`} className="block py-3 px-3">
                                            {renderCell(project, columnId)}
                                        </Link>
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                </div>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-center px-2">
                <Pagination>
                    <PaginationContent>
                        <PaginationItem>
                            <PaginationPrevious
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                            />
                        </PaginationItem>

                        {totalPages > 0 && Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                            // Show first page, last page, current page, and pages around current
                            const showPage = page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1
                            const showEllipsis = (page === 2 && currentPage > 3) || (page === totalPages - 1 && currentPage < totalPages - 2)

                            if (showEllipsis) {
                                return (
                                    <PaginationItem key={page}>
                                        <PaginationEllipsis />
                                    </PaginationItem>
                                )
                            }

                            if (!showPage) return null

                            return (
                                <PaginationItem key={page}>
                                    <PaginationLink
                                        onClick={() => setCurrentPage(page)}
                                        isActive={currentPage === page}
                                        className="cursor-pointer"
                                    >
                                        {page}
                                    </PaginationLink>
                                </PaginationItem>
                            )
                        })}

                        <PaginationItem>
                            <PaginationNext
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                            />
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
            </div>
        </div>
    )
})

ProjectsTable.displayName = 'ProjectsTable'
