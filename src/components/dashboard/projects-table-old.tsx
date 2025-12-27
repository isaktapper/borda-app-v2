"use client"

import { useState, useMemo } from "react"
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

type Project = {
    id: string
    client_name: string
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
}

type SortField = 'id' | 'client_name' | 'name' | 'status' | 'target_go_live_date' | 'created_at' | 'assigned_to'
type SortOrder = 'asc' | 'desc' | null

interface ProjectsTableProps {
    projects: Project[]
}

export function ProjectsTable({ projects }: ProjectsTableProps) {
    const [sortField, setSortField] = useState<SortField | null>(null)
    const [sortOrder, setSortOrder] = useState<SortOrder>(null)
    const [filter, setFilter] = useState("")

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : sortOrder === 'desc' ? null : 'asc')
            if (sortOrder === 'desc') setSortField(null)
        } else {
            setSortField(field)
            setSortOrder('asc')
        }
    }

    const sortedAndFilteredProjects = useMemo(() => {
        let result = [...projects]

        // Filter
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

        // Sort
        if (sortField && sortOrder) {
            result.sort((a, b) => {
                let aVal: any
                let bVal: any

                if (sortField === 'assigned_to') {
                    aVal = a.assigned_user?.full_name || a.assigned_user?.email || ''
                    bVal = b.assigned_user?.full_name || b.assigned_user?.email || ''
                } else {
                    aVal = a[sortField]
                    bVal = b[sortField]
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
    }, [projects, filter, sortField, sortOrder])

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

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <Input
                    placeholder="Filter projects..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="max-w-sm h-8 text-sm"
                />
            </div>

            <div className="bg-card/80 backdrop-blur-xl rounded-xl shadow-lg shadow-black/5 border border-border/50">
                <Table>
                    <TableHeader>
                        <TableRow className="border-b hover:bg-transparent">
                            <TableHead className="h-10 px-3">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSort('id')}
                                    className="h-7 px-2 text-xs font-medium hover:bg-transparent gap-1.5"
                                >
                                    ID
                                    <SortIcon field="id" />
                                </Button>
                            </TableHead>
                            <TableHead className="h-10 px-3">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSort('client_name')}
                                    className="h-7 px-2 text-xs font-medium hover:bg-transparent gap-1.5"
                                >
                                    CUSTOMER
                                    <SortIcon field="client_name" />
                                </Button>
                            </TableHead>
                            <TableHead className="h-10 px-3">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSort('name')}
                                    className="h-7 px-2 text-xs font-medium hover:bg-transparent gap-1.5"
                                >
                                    PROJECT NAME
                                    <SortIcon field="name" />
                                </Button>
                            </TableHead>
                            <TableHead className="h-10 px-3">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSort('status')}
                                    className="h-7 px-2 text-xs font-medium hover:bg-transparent gap-1.5"
                                >
                                    STATUS
                                    <SortIcon field="status" />
                                </Button>
                            </TableHead>
                            <TableHead className="h-10 px-3">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSort('target_go_live_date')}
                                    className="h-7 px-2 text-xs font-medium hover:bg-transparent gap-1.5"
                                >
                                    GO-LIVE
                                    <SortIcon field="target_go_live_date" />
                                </Button>
                            </TableHead>
                            <TableHead className="h-10 px-3">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSort('assigned_to')}
                                    className="h-7 px-2 text-xs font-medium hover:bg-transparent gap-1.5"
                                >
                                    ASSIGNED TO
                                    <SortIcon field="assigned_to" />
                                </Button>
                            </TableHead>
                            <TableHead className="h-10 px-3">
                                <div className="h-7 px-2 text-xs font-medium">
                                    PROGRESS
                                </div>
                            </TableHead>
                            <TableHead className="h-10 px-3 text-right">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSort('created_at')}
                                    className="h-7 px-2 text-xs font-medium hover:bg-transparent gap-1.5"
                                >
                                    CREATED
                                    <SortIcon field="created_at" />
                                </Button>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedAndFilteredProjects.map((project) => (
                            <TableRow key={project.id} className="cursor-pointer hover:bg-muted/5 border-b last:border-0">
                                <TableCell className="font-mono text-xs p-0">
                                    <Link href={`/dashboard/projects/${project.id}`} className="block py-3 px-3">
                                        {project.id}
                                    </Link>
                                </TableCell>
                                <TableCell className="font-medium text-sm p-0">
                                    <Link href={`/dashboard/projects/${project.id}`} className="block py-3 px-3">
                                        {project.client_name}
                                    </Link>
                                </TableCell>
                                <TableCell className="text-sm p-0">
                                    <Link href={`/dashboard/projects/${project.id}`} className="block py-3 px-3">
                                        {project.name}
                                    </Link>
                                </TableCell>
                                <TableCell className="p-0">
                                    <Link href={`/dashboard/projects/${project.id}`} className="block py-3 px-3">
                                        <Badge
                                            variant={
                                                project.status === 'active' ? 'default' :
                                                    project.status === 'draft' ? 'secondary' :
                                                        project.status === 'completed' ? 'success' :
                                                            project.status === 'paused' ? 'warning' :
                                                                project.status === 'archived' ? 'outline' :
                                                                    'outline'
                                            }
                                            className="capitalize text-xs h-5 !rounded-sm"
                                        >
                                            {project.status}
                                        </Badge>
                                    </Link>
                                </TableCell>
                                <TableCell className="text-sm p-0">
                                    <Link href={`/dashboard/projects/${project.id}`} className="block py-3 px-3">
                                        {project.target_go_live_date
                                            ? format(new Date(project.target_go_live_date), 'MMM d, yyyy')
                                            : '-'
                                        }
                                    </Link>
                                </TableCell>
                                <TableCell className="text-sm p-0">
                                    <Link href={`/dashboard/projects/${project.id}`} className="flex items-center gap-2 py-3 px-3">
                                        {project.assigned_user ? (
                                            <>
                                                <Avatar className="h-6 w-6">
                                                    <AvatarImage src={project.assigned_user.avatar_url || undefined} />
                                                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                                        {(project.assigned_user.full_name || project.assigned_user.email || 'U').charAt(0).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span>{project.assigned_user.full_name || project.assigned_user.email || 'Unassigned'}</span>
                                            </>
                                        ) : (
                                            '-'
                                        )}
                                    </Link>
                                </TableCell>
                                <TableCell className="p-0">
                                    <Link href={`/dashboard/projects/${project.id}`} className="block py-3 px-3">
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
                                    </Link>
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground text-xs p-0">
                                    <Link href={`/dashboard/projects/${project.id}`} className="block py-3 px-3">
                                        {format(new Date(project.created_at), 'MMM d, yyyy')}
                                    </Link>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
