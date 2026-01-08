'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { inviteCustomer, getProjectMembers, cancelInvite, resendInvite } from '@/app/(app)/spaces/[spaceId]/team-actions'
import { getOrgMembers } from '@/app/(app)/settings/team-actions'
import { updateProjectAssignee } from '@/app/(app)/settings/team-actions'
import { Mail, Send, Trash2, RefreshCw, Loader2, Users, AlertCircle, UserCheck } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface TeamTabContentProps {
    spaceId: string
    organizationId: string
    currentAssignee?: string | null
}

export function TeamTabContent({ spaceId, organizationId, currentAssignee }: TeamTabContentProps) {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [members, setMembers] = useState<any[]>([])
    const [orgMembers, setOrgMembers] = useState<any[]>([])
    const [assignee, setAssignee] = useState<string | null>(currentAssignee || null)
    const [fetching, setFetching] = useState(true)

    const fetchMembers = async () => {
        setFetching(true)
        const [projectResult, orgResult] = await Promise.all([
            getProjectMembers(spaceId),
            getOrgMembers(organizationId)
        ])
        if (projectResult.data) {
            setMembers(projectResult.data)
        }
        if (orgResult) {
            setOrgMembers(orgResult.filter(m => m.user_id !== null)) // Only show joined members
        }
        setFetching(false)
    }

    useEffect(() => {
        fetchMembers()
    }, [spaceId, organizationId])

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email) return

        setLoading(true)
        const result = await inviteCustomer(spaceId, email)
        setLoading(false)

        if (result.success) {
            toast.success('Inbjudan skickad!')
            setEmail('')
            fetchMembers()
        } else {
            toast.error(result.error || 'Something went wrong')
        }
    }

    const handleCancel = async (memberId: string) => {
        if (!confirm('Are you sure you want to remove this invitation?')) return
        const result = await cancelInvite(memberId, spaceId)
        if (result.success) {
            toast.success('Inbjudan borttagen')
            fetchMembers()
        } else {
            toast.error('Kunde inte ta bort inbjudan')
        }
    }

    const handleResend = async (memberId: string) => {
        const result = await resendInvite(memberId, spaceId)
        if (result.success) {
            toast.success('Invitation resent!')
        } else {
            toast.error('Kunde inte skicka om inbjudan')
        }
    }

    const handleAssigneeChange = async (userId: string) => {
        const result = await updateProjectAssignee(spaceId, userId === 'none' ? null : userId)
        if (result.success) {
            setAssignee(userId === 'none' ? null : userId)
            toast.success('Ansvarig uppdaterad')
        } else {
            toast.error('Kunde inte uppdatera ansvarig')
        }
    }

    const currentMembers = members.filter(m => m.joined_at !== null)
    const pendingInvites = members.filter(m => m.joined_at === null)

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Invite Section */}
            <Card className="p-6 border-2 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Mail className="size-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold tracking-tight">Bjud in kund</h3>
                        <p className="text-sm text-muted-foreground">Send an invitation to your customer to give them access to the portal.</p>
                    </div>
                </div>

                <form onSubmit={handleInvite} className="flex gap-3">
                    <div className="relative flex-1">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                            placeholder="kundens.email@foretag.se"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="pl-10 h-11 border-2 focus-visible:ring-primary/20 rounded-xl"
                            required
                        />
                    </div>
                    <Button type="submit" disabled={loading} className="h-11 px-6 rounded-xl gap-2 font-bold transition-all hover:scale-105 active:scale-95">
                        {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                        Invite
                    </Button>
                </form>
            </Card>

            {/* Assignee Section */}
            <Card className="p-6 border-2 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                    <div className="size-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                        <UserCheck className="size-5 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold tracking-tight">Ansvarig CS</h3>
                        <p className="text-sm text-muted-foreground">Select who on the team is responsible for this project</p>
                    </div>
                </div>

                <Select
                    value={assignee || 'none'}
                    onValueChange={handleAssigneeChange}
                >
                    <SelectTrigger className="h-11 border-2 rounded-xl">
                        <SelectValue placeholder="Select assignee..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">Ingen ansvarig</SelectItem>
                        {orgMembers.map((member) => (
                            <SelectItem key={member.id} value={member.user_id!}>
                                {member.users?.full_name || member.users?.email || member.invited_email}
                                <span className="text-xs text-muted-foreground ml-2">
                                    ({member.role})
                                </span>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </Card>

            {fetching ? (
                <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                    <Loader2 className="size-10 text-primary/20 animate-spin mb-4" />
                    <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground/40">Loading team...</p>
                </div>
            ) : (
                <div className="grid gap-8 md:grid-cols-2">
                    {/* Members List */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-2">
                                <Users className="size-4 text-muted-foreground" />
                                <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Medlemmar ({currentMembers.length})</h4>
                            </div>
                        </div>
                        <div className="grid gap-3">
                            {currentMembers.length === 0 ? (
                                <div className="border-2 border-dashed rounded-2xl p-8 text-center bg-muted/5">
                                    <p className="text-sm text-muted-foreground">No members have joined yet.</p>
                                </div>
                            ) : (
                                currentMembers.map((m) => (
                                    <Card key={m.id} className="p-4 border-2 hover:border-primary/20 transition-all duration-300 group shadow-sm">
                                        <div className="flex items-center gap-4">
                                            <Avatar className="size-10 border-2 border-background shadow-sm">
                                                <AvatarImage src={m.user?.avatar_url} />
                                                <AvatarFallback className="bg-primary/5 text-primary font-bold">
                                                    {(m.user?.full_name || m.invited_email || '?').charAt(0).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-black truncate">{m.user?.full_name || m.invited_email || 'Medlem'}</p>
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider truncate">
                                                    {m.user?.email || m.invited_email || 'Ingen e-post'}
                                                </p>
                                            </div>
                                            <Badge variant="secondary" className="bg-primary/5 text-primary font-bold uppercase text-[9px] tracking-widest">
                                                {m.role === 'customer' ? 'Kund' : m.role}
                                            </Badge>
                                        </div>
                                    </Card>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Pending Invites List */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-2">
                                <AlertCircle className="size-4 text-amber-500/60" />
                                <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Pending invitations ({pendingInvites.length})</h4>
                            </div>
                        </div>
                        <div className="grid gap-3">
                            {pendingInvites.length === 0 ? (
                                <div className="border-2 border-dashed rounded-2xl p-8 text-center bg-muted/5">
                                    <p className="text-sm text-muted-foreground">No pending invitations.</p>
                                </div>
                            ) : (
                                pendingInvites.map((i) => (
                                    <Card key={i.id} className="p-4 border-2 border-amber-50 bg-amber-50/10 hover:border-amber-200 transition-all duration-300 group shadow-sm">
                                        <div className="flex items-center gap-4">
                                            <div className="size-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0 border border-amber-100">
                                                <Mail className="size-4 text-amber-600/60" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-black truncate text-amber-900/80">{i.invited_email}</p>
                                                <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest">
                                                    Inbjuden {format(new Date(i.created_at), 'd MMM')}, roll: {i.role}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="size-8 text-muted-foreground hover:text-primary rounded-lg"
                                                    onClick={() => handleResend(i.id)}
                                                >
                                                    <RefreshCw className="size-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="size-8 text-muted-foreground hover:text-destructive rounded-lg"
                                                    onClick={() => handleCancel(i.id)}
                                                >
                                                    <Trash2 className="size-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    </Card>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
