'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { UserCheck, ChevronDown, ChevronUp } from 'lucide-react'
import { AccessRequestsTable } from './access-requests-table'
import { getAccessRequests, type AccessRequest } from '@/app/(app)/settings/access-request-actions'

interface AccessRequestsSectionProps {
  organizationId: string
  pendingCount: number
}

export function AccessRequestsSection({ organizationId, pendingCount }: AccessRequestsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [requests, setRequests] = useState<AccessRequest[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)

  const loadRequests = useCallback(async () => {
    if (hasLoaded) return
    
    setIsLoading(true)
    const data = await getAccessRequests(organizationId)
    setRequests(data.filter(r => r.status === 'pending'))
    setIsLoading(false)
    setHasLoaded(true)
  }, [organizationId, hasLoaded])

  useEffect(() => {
    if (isExpanded && !hasLoaded) {
      loadRequests()
    }
  }, [isExpanded, hasLoaded, loadRequests])

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">Access Requests</h3>
        <p className="text-sm text-muted-foreground">
          Review requests from users wanting to join your organization
        </p>
      </div>
      
      <Card className="overflow-hidden">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-full p-2 bg-primary/10">
              <UserCheck className="size-4 text-primary" />
            </div>
            <div className="text-left">
              <p className="font-medium">
                {pendingCount} pending request{pendingCount !== 1 ? 's' : ''}
              </p>
              <p className="text-sm text-muted-foreground">
                Click to {isExpanded ? 'hide' : 'review'}
              </p>
            </div>
          </div>
          {isExpanded ? (
            <ChevronUp className="size-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-5 text-muted-foreground" />
          )}
        </button>
        
        {isExpanded && (
          <div className="border-t">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">
                Loading requests...
              </div>
            ) : (
              <AccessRequestsTable requests={requests} canManage={true} />
            )}
          </div>
        )}
      </Card>
    </div>
  )
}
