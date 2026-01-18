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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { format } from "date-fns"
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MemberActions } from "@/components/dashboard/member-actions"
import type { OrgMember } from "@/app/(app)/settings/team-actions"

type SortField = 'name' | 'email' | 'role' | 'invited_at' | 'joined_at'
type SortOrder = 'asc' | 'desc' | null

interface TeamMembersTableProps {
    members: OrgMember[]
    currentUserId: string
    currentUserRole: string
    canManageTeam: boolean
}

export function TeamMembersTable({ members, currentUserId, currentUserRole, canManageTeam }: TeamMembersTableProps) {
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

    const sortedAndFilteredMembers = useMemo(() => {
        let result = [...members]

        // Filter
        if (filter) {
            result = result.filter(member => {
                const name = member.users?.full_name || member.invited_email
                const email = member.users?.email || member.invited_email
                const role = member.user_id ? member.role : 'Invited'

                return name.toLowerCase().includes(filter.toLowerCase()) ||
                    email.toLowerCase().includes(filter.toLowerCase()) ||
                    role.toLowerCase().includes(filter.toLowerCase())
            })
        }

        // Sort
        if (sortField && sortOrder) {
            result.sort((a, b) => {
                let aVal: any
                let bVal: any

                switch (sortField) {
                    case 'name':
                        aVal = a.users?.full_name || a.invited_email
                        bVal = b.users?.full_name || b.invited_email
                        break
                    case 'email':
                        aVal = a.users?.email || a.invited_email
                        bVal = b.users?.email || b.invited_email
                        break
                    case 'role':
                        aVal = a.user_id ? a.role : 'Invited'
                        bVal = b.user_id ? b.role : 'Invited'
                        break
                    case 'invited_at':
                        aVal = a.invited_at
                        bVal = b.invited_at
                        break
                    case 'joined_at':
                        aVal = a.joined_at || ''
                        bVal = b.joined_at || ''
                        break
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
    }, [members, filter, sortField, sortOrder])

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

    const getRoleBadgeVariant = (member: OrgMember) => {
        if (!member.user_id) return 'outline' // Pending

        switch (member.role) {
            case 'owner':
                return 'default'
            case 'admin':
                return 'secondary'
            default:
                return 'outline'
        }
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <Input
                    placeholder="Filter members..."
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
                                    onClick={() => handleSort('email')}
                                    className="h-7 px-2 text-xs font-medium hover:bg-transparent gap-1.5"
                                >
                                    EMAIL
                                    <SortIcon field="email" />
                                </Button>
                            </TableHead>
                            <TableHead className="h-10 px-3">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSort('role')}
                                    className="h-7 px-2 text-xs font-medium hover:bg-transparent gap-1.5"
                                >
                                    ROLE
                                    <SortIcon field="role" />
                                </Button>
                            </TableHead>
                            <TableHead className="h-10 px-3">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSort('invited_at')}
                                    className="h-7 px-2 text-xs font-medium hover:bg-transparent gap-1.5"
                                >
                                    CREATED
                                    <SortIcon field="invited_at" />
                                </Button>
                            </TableHead>
                            <TableHead className="h-10 px-3">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSort('joined_at')}
                                    className="h-7 px-2 text-xs font-medium hover:bg-transparent gap-1.5"
                                >
                                    LAST ACTIVE
                                    <SortIcon field="joined_at" />
                                </Button>
                            </TableHead>
                            {canManageTeam && (
                                <TableHead className="h-10 px-3 w-[50px]"></TableHead>
                            )}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedAndFilteredMembers.map((member) => {
                            const displayName = member.users?.full_name || member.invited_email
                            const displayEmail = member.users?.email || member.invited_email
                            const displayRole = member.user_id ? member.role : 'Invited'
                            const isCurrentUser = member.user_id === currentUserId
                            const isPending = !member.user_id

                            return (
                                <TableRow key={member.id} className="hover:bg-muted/5 border-b last:border-0">
                                    <TableCell className="p-3">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="size-8">
                                                <AvatarFallback className={isPending ? "bg-yellow-100 dark:bg-yellow-900/50 text-yellow-600 dark:text-yellow-400" : "bg-primary/10 text-primary"}>
                                                    {displayName[0].toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-sm">{displayName}</span>
                                                {isCurrentUser && (
                                                    <Badge variant="outline" className="text-xs">
                                                        You
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm p-3">
                                        {displayEmail}
                                    </TableCell>
                                    <TableCell className="p-3">
                                        <Badge
                                            variant={getRoleBadgeVariant(member)}
                                            className={isPending ? "text-yellow-600 border-yellow-600 capitalize text-xs h-5 !rounded-md" : "capitalize text-xs h-5 !rounded-md"}
                                        >
                                            {displayRole}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground p-3">
                                        {format(new Date(member.invited_at), 'd MMM yyyy')}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground p-3">
                                        {member.joined_at ? format(new Date(member.joined_at), 'd MMM yyyy') : '-'}
                                    </TableCell>
                                    {canManageTeam && (
                                        <TableCell className="p-3">
                                            {!isCurrentUser && (
                                                <MemberActions
                                                    memberId={member.id}
                                                    currentRole={member.role}
                                                    userRole={currentUserRole}
                                                    isPending={isPending}
                                                />
                                            )}
                                        </TableCell>
                                    )}
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
