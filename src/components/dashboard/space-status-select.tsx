'use client'

import { useState } from 'react'
import { StatusBadge } from './status-badge'
import { ArchiveDialog } from './archive-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { updateSpaceStatus, type SpaceStatus } from '@/app/(app)/spaces/[spaceId]/status-actions'
import { getAvailableStatuses } from '@/app/(app)/spaces/[spaceId]/status-utils'
import { toast } from 'sonner'

interface SpaceStatusSelectProps {
  spaceId: string
  currentStatus: SpaceStatus
  projectName: string
}

export function SpaceStatusSelect({
  spaceId,
  currentStatus,
  projectName
}: SpaceStatusSelectProps) {
  const [isArchiveDialogOpen, setArchiveDialogOpen] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<SpaceStatus | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  const statusOptions = getAvailableStatuses(currentStatus)

  async function handleStatusChange(newStatus: string) {
    // Show confirmation dialog for archiving
    if (newStatus === 'archived') {
      setPendingStatus('archived')
      setArchiveDialogOpen(true)
      return
    }

    // Update status directly for other transitions
    await performStatusUpdate(newStatus as SpaceStatus)
  }

  async function performStatusUpdate(newStatus: SpaceStatus) {
    setIsUpdating(true)

    const result = await updateSpaceStatus(spaceId, newStatus)

    setIsUpdating(false)

    if (result.success) {
      toast.success(`Status uppdaterad till ${newStatus}`)
    } else {
      toast.error(result.error || 'Kunde inte uppdatera status')
    }
  }

  async function handleArchiveConfirm() {
    setArchiveDialogOpen(false)
    if (pendingStatus) {
      await performStatusUpdate(pendingStatus)
      setPendingStatus(null)
    }
  }

  // Get badge variant classes (matching soft badge design)
  const getVariantClass = (status: SpaceStatus) => {
    const variantClasses = {
      draft: 'bg-gray-100 text-gray-600',
      active: 'bg-blue-100 text-blue-600',
      completed: 'bg-emerald-100 text-emerald-600',
      archived: 'bg-gray-200 text-gray-700',
    }
    return variantClasses[status]
  }

  return (
    <>
      <Select
        value={currentStatus}
        onValueChange={handleStatusChange}
        disabled={isUpdating}
      >
        <SelectTrigger className={`w-auto px-2.5 py-1 capitalize text-xs font-medium rounded-md transition-colors ${getVariantClass(currentStatus)}`}>
          <SelectValue>
            {currentStatus}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {statusOptions.map(status => (
            <SelectItem key={status} value={status} className="capitalize">
              {status}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <ArchiveDialog
        open={isArchiveDialogOpen}
        onOpenChange={setArchiveDialogOpen}
        onConfirm={handleArchiveConfirm}
        projectName={projectName}
      />
    </>
  )
}
