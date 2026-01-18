'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { updateJoinPolicy } from '@/app/(app)/settings/access-request-actions'
import { toast } from 'sonner'

interface JoinPolicySettingsProps {
  organizationId: string
  domain: string | null
  currentPolicy: 'invite_only' | 'domain_auto_join'
  canManage: boolean
}

export function JoinPolicySettings({ 
  organizationId, 
  domain,
  currentPolicy, 
  canManage 
}: JoinPolicySettingsProps) {
  const [policy, setPolicy] = useState(currentPolicy)
  const [isLoading, setIsLoading] = useState(false)

  const handlePolicyChange = async (newPolicy: 'invite_only' | 'domain_auto_join') => {
    if (!canManage || newPolicy === policy) return

    setIsLoading(true)
    const previousPolicy = policy
    setPolicy(newPolicy)

    const result = await updateJoinPolicy(organizationId, newPolicy)

    setIsLoading(false)

    if (result.error) {
      toast.error(result.error)
      setPolicy(previousPolicy)
    } else {
      toast.success('Join policy updated')
    }
  }

  if (!domain) {
    return (
      <div className="flex items-center justify-between py-3">
        <Label className="text-sm font-medium flex-shrink-0 w-40">
          Join Policy
        </Label>
        <p className="text-sm text-muted-foreground">
          No domain configured — members join via invitation only
        </p>
      </div>
    )
  }

  const explanation = policy === 'domain_auto_join'
    ? `Anyone with @${domain} can join automatically`
    : `Users with @${domain} must request access`

  return (
    <div className="flex items-center justify-between py-3">
      <Label className="text-sm font-medium flex-shrink-0 w-40">
        Join Policy
      </Label>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">{explanation}</span>
        <Select
          value={policy}
          onValueChange={(value) => handlePolicyChange(value as 'invite_only' | 'domain_auto_join')}
          disabled={!canManage || isLoading}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="invite_only">Require approval</SelectItem>
            <SelectItem value="domain_auto_join">Auto join</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
