'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Loader2, Save, Archive } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { SpaceTagsSection } from '@/components/dashboard/space-tags-section'

interface GeneralSettingsSectionProps {
    spaceId: string
    organizationId: string
    initialClientName: string
    initialProjectName?: string
    initialStatus?: string
    initialTargetGoLiveDate?: string | null
    currentAssignee?: string | null
}

const STATUS_OPTIONS = [
    { value: 'draft', label: 'Draft' },
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' },
    { value: 'archived', label: 'Archived' }
]

export function GeneralSettingsSection({
    spaceId,
    organizationId,
    initialClientName,
    initialProjectName,
    initialStatus = 'draft',
    initialTargetGoLiveDate,
    currentAssignee
}: GeneralSettingsSectionProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [archiveLoading, setArchiveLoading] = useState(false)
    const [orgMembers, setOrgMembers] = useState<any[]>([])

    const [clientName, setClientName] = useState(initialClientName)
    const [projectName, setProjectName] = useState(initialProjectName || initialClientName)
    const [status, setStatus] = useState(initialStatus)
    const [targetGoLiveDate, setTargetGoLiveDate] = useState(initialTargetGoLiveDate || '')
    const [assignee, setAssignee] = useState<string | null>(currentAssignee || null)

    // Fetch org members
    useEffect(() => {
        const fetchOrgMembers = async () => {
            const supabase = createClient()
            const { data } = await supabase
                .from('organization_members')
                .select('id, role, user_id, users:user_id(id, full_name, email)')
                .eq('organization_id', organizationId)
                .not('user_id', 'is', null)

            if (data) {
                setOrgMembers(data)
            }
        }
        fetchOrgMembers()
    }, [organizationId])

    const handleSave = async () => {
        setLoading(true)
        const supabase = createClient()

        const { error } = await supabase
            .from('spaces')
            .update({
                client_name: clientName,
                name: projectName,
                status,
                target_go_live_date: targetGoLiveDate || null,
                assigned_to: assignee
            })
            .eq('id', spaceId)

        setLoading(false)

        if (error) {
            toast.error('Failed to update project settings')
            console.error(error)
        } else {
            toast.success('Settings saved successfully')
            router.refresh()
        }
    }

    const handleArchive = async () => {
        if (!confirm('Are you sure you want to archive this project? You can restore it later from the archived projects view.')) {
            return
        }

        setArchiveLoading(true)
        const supabase = createClient()

        const { error } = await supabase
            .from('spaces')
            .update({ status: 'archived' })
            .eq('id', spaceId)

        setArchiveLoading(false)

        if (error) {
            toast.error('Failed to archive project')
            console.error(error)
        } else {
            toast.success('Space archived successfully')
            router.push('/spaces')
        }
    }

    return (
        <div className="space-y-6">
            {/* Settings Table */}
            <div className="divide-y rounded-lg border">
                {/* Customer Name */}
                <div className="grid grid-cols-[300px_1fr] p-4 items-center">
                    <Label htmlFor="client-name" className="text-sm font-medium">
                        Customer Name
                    </Label>
                    <div className="flex justify-end">
                        <Input
                            id="client-name"
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                            placeholder="Enter customer name"
                            className="w-96"
                        />
                    </div>
                </div>

                {/* Space Name */}
                <div className="grid grid-cols-[300px_1fr] p-4 items-center">
                    <Label htmlFor="space-name" className="text-sm font-medium">
                        Space Name
                    </Label>
                    <div className="flex justify-end">
                        <Input
                            id="space-name"
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                            placeholder="Enter space name"
                            className="w-96"
                        />
                    </div>
                </div>

                {/* Ansvarig */}
                <div className="grid grid-cols-[300px_1fr] p-4 items-center">
                    <Label htmlFor="assignee" className="text-sm font-medium">
                        Ansvarig
                    </Label>
                    <div className="flex justify-end">
                        <Select value={assignee || 'none'} onValueChange={(val) => setAssignee(val === 'none' ? null : val)}>
                            <SelectTrigger id="assignee" className="w-96">
                                <SelectValue placeholder="Select assignee..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Ingen ansvarig</SelectItem>
                                {orgMembers.map((member) => (
                                    <SelectItem key={member.id} value={member.user_id!}>
                                        {member.users?.full_name || member.users?.email}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Status */}
                <div className="grid grid-cols-[300px_1fr] p-4 items-center">
                    <Label htmlFor="status" className="text-sm font-medium">
                        Status
                    </Label>
                    <div className="flex justify-end">
                        <Select value={status} onValueChange={setStatus}>
                            <SelectTrigger id="status" className="w-96">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {STATUS_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Tags */}
                <div className="grid grid-cols-[300px_1fr] p-4 items-center">
                    <Label className="text-sm font-medium">
                        Tags
                    </Label>
                    <div className="flex justify-end w-96 ml-auto">
                        <SpaceTagsSection spaceId={spaceId} />
                    </div>
                </div>

                {/* Target Go Live Date */}
                <div className="grid grid-cols-[300px_1fr] p-4 items-center">
                    <Label htmlFor="target-date" className="text-sm font-medium">
                        Target Go Live Date
                    </Label>
                    <div className="flex justify-end">
                        <Input
                            id="target-date"
                            type="date"
                            value={targetGoLiveDate}
                            onChange={(e) => setTargetGoLiveDate(e.target.value)}
                            className="w-96"
                        />
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t">
                <Button
                    variant="destructive"
                    onClick={handleArchive}
                    disabled={archiveLoading || status === 'archived'}
                    className="gap-2"
                >
                    {archiveLoading ? (
                        <Loader2 className="size-4 animate-spin" />
                    ) : (
                        <Archive className="size-4" />
                    )}
                    Archive Space
                </Button>

                <Button onClick={handleSave} disabled={loading} className="gap-2">
                    {loading ? (
                        <Loader2 className="size-4 animate-spin" />
                    ) : (
                        <Save className="size-4" />
                    )}
                    Save Changes
                </Button>
            </div>
        </div>
    )
}
