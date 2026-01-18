'use client'

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  approveAccessRequest, 
  denyAccessRequest,
  type AccessRequest 
} from '@/app/(app)/settings/access-request-actions'
import { toast } from 'sonner'
import { Loader2, Check, X, Clock, UserCheck, UserX } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface AccessRequestsTableProps {
  requests: AccessRequest[]
  canManage: boolean
}

export function AccessRequestsTable({ requests, canManage }: AccessRequestsTableProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [actionType, setActionType] = useState<'approve' | 'deny' | null>(null)

  const handleApprove = async (requestId: string) => {
    setLoadingId(requestId)
    setActionType('approve')

    const result = await approveAccessRequest(requestId)

    setLoadingId(null)
    setActionType(null)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Access request approved')
    }
  }

  const handleDeny = async (requestId: string) => {
    setLoadingId(requestId)
    setActionType('deny')

    const result = await denyAccessRequest(requestId)

    setLoadingId(null)
    setActionType(null)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Access request denied')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        )
      case 'approved':
        return (
          <Badge variant="default" className="gap-1 bg-green-600">
            <UserCheck className="h-3 w-3" />
            Approved
          </Badge>
        )
      case 'denied':
        return (
          <Badge variant="secondary" className="gap-1">
            <UserX className="h-3 w-3" />
            Denied
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No access requests yet.</p>
        <p className="text-sm mt-1">
          Requests will appear here when users with your domain try to join.
        </p>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Email</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Requested</TableHead>
          <TableHead>Status</TableHead>
          {canManage && <TableHead className="text-right">Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.map((request) => (
          <TableRow key={request.id}>
            <TableCell className="font-medium">{request.email}</TableCell>
            <TableCell>{request.name || '—'}</TableCell>
            <TableCell className="text-muted-foreground">
              {formatDistanceToNow(new Date(request.requested_at), { addSuffix: true })}
            </TableCell>
            <TableCell>{getStatusBadge(request.status)}</TableCell>
            {canManage && (
              <TableCell className="text-right">
                {request.status === 'pending' ? (
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeny(request.id)}
                      disabled={loadingId === request.id}
                    >
                      {loadingId === request.id && actionType === 'deny' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <X className="h-4 w-4 mr-1" />
                          Deny
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApprove(request.id)}
                      disabled={loadingId === request.id}
                    >
                      {loadingId === request.id && actionType === 'approve' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {request.resolved_at && 
                      formatDistanceToNow(new Date(request.resolved_at), { addSuffix: true })
                    }
                  </span>
                )}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
