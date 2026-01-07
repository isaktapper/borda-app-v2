'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { inviteToOrganization } from '@/app/(app)/settings/team-actions'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface InviteMemberFormProps {
  organizationId: string
  currentRole: string
}

export function InviteMemberForm({ organizationId, currentRole }: InviteMemberFormProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'owner' | 'admin' | 'member'>('member')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email) {
      toast.error('Ange en e-postadress')
      return
    }

    setLoading(true)

    const result = await inviteToOrganization(organizationId, email, role)

    setLoading(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(`Inbjudan skickad till ${email}`)
      setEmail('')
      setRole('member')
    }
  }

  const canInviteOwner = currentRole === 'owner'

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      <div className="flex-1">
        <Input
          type="email"
          placeholder="namn@foretag.se"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
        />
      </div>
      <Select
        value={role}
        onValueChange={(value: any) => setRole(value)}
        disabled={loading}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="member">Member</SelectItem>
          <SelectItem value="admin">Admin</SelectItem>
          {canInviteOwner && <SelectItem value="owner">Owner</SelectItem>}
        </SelectContent>
      </Select>
      <Button type="submit" disabled={loading}>
        {loading && <Loader2 className="size-4 mr-2 animate-spin" />}
        Bjud in
      </Button>
    </form>
  )
}
