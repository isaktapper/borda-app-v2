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
import { format } from "date-fns"
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TemplateActions } from "@/components/dashboard/template-actions"

type Template = {
    id: string
    name: string
    description: string | null
    template_data: {
        pages?: any[]
    }
    created_at: string
}

type SortField = 'name' | 'description' | 'pages' | 'created_at'
type SortOrder = 'asc' | 'desc' | null

interface TemplatesTableProps {
    templates: Template[]
}

export function TemplatesTable({ templates }: TemplatesTableProps) {
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

    const sortedAndFilteredTemplates = useMemo(() => {
        let result = [...templates]

        // Filter
        if (filter) {
            result = result.filter(template =>
                template.name.toLowerCase().includes(filter.toLowerCase()) ||
                (template.description && template.description.toLowerCase().includes(filter.toLowerCase()))
            )
        }

        // Sort
        if (sortField && sortOrder) {
            result.sort((a, b) => {
                let aVal: any = a[sortField]
                let bVal: any = b[sortField]

                if (sortField === 'pages') {
                    aVal = a.template_data.pages?.length || 0
                    bVal = b.template_data.pages?.length || 0
                }

                if (aVal === null) return 1
                if (bVal === null) return -1

                if (typeof aVal === 'string') aVal = aVal.toLowerCase()
                if (typeof bVal === 'string') bVal = bVal.toLowerCase()

                if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
                if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
                return 0
            })
        }

        return result
    }, [templates, filter, sortField, sortOrder])

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
                    placeholder="Filter templates..."
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
                                    onClick={() => handleSort('name')}
                                    className="h-7 px-2 text-xs font-medium hover:bg-transparent gap-1.5"
                                >
                                    NAME
                                    <SortIcon field="name" />
                                </Button>
                            </TableHead>
                            <TableHead className="h-10 px-3">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSort('description')}
                                    className="h-7 px-2 text-xs font-medium hover:bg-transparent gap-1.5"
                                >
                                    DESCRIPTION
                                    <SortIcon field="description" />
                                </Button>
                            </TableHead>
                            <TableHead className="h-10 px-3">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSort('pages')}
                                    className="h-7 px-2 text-xs font-medium hover:bg-transparent gap-1.5"
                                >
                                    PAGES
                                    <SortIcon field="pages" />
                                </Button>
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
                            <TableHead className="h-10 px-3 w-[60px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedAndFilteredTemplates.map((template) => (
                            <TableRow key={template.id} className="hover:bg-muted/5 border-b last:border-0">
                                <TableCell className="font-medium text-sm py-3 px-3">
                                    {template.name}
                                </TableCell>
                                <TableCell className="text-muted-foreground text-sm py-3 px-3">
                                    {template.description || '-'}
                                </TableCell>
                                <TableCell className="text-muted-foreground text-xs py-3 px-3">
                                    {template.template_data.pages?.length || 0} pages
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground text-xs py-3 px-3">
                                    {format(new Date(template.created_at), 'MMM d, yyyy')}
                                </TableCell>
                                <TableCell className="py-3 px-3">
                                    <TemplateActions template={template} />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
