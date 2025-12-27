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
import { updateProjectStatus, type ProjectStatus } from '@/app/dashboard/projects/[projectId]/status-actions'
import { getAvailableStatuses } from '@/app/dashboard/projects/[projectId]/status-utils'
import { toast } from 'sonner'

interface ProjectStatusSelectProps {
  projectId: string
  currentStatus: ProjectStatus
  projectName: string
}

export function ProjectStatusSelect({
  projectId,
  currentStatus,
  projectName
}: ProjectStatusSelectProps) {
  const [isArchiveDialogOpen, setArchiveDialogOpen] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<ProjectStatus | null>(null)
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
    await performStatusUpdate(newStatus as ProjectStatus)
  }

  async function performStatusUpdate(newStatus: ProjectStatus) {
    setIsUpdating(true)

    const result = await updateProjectStatus(projectId, newStatus)

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

  // Get badge variant classes (matching Badge component exactly)
  const getVariantClass = (status: ProjectStatus) => {
    const variantClasses = {
      draft: 'border-border bg-muted text-muted-foreground hover:bg-muted/90',
      active: 'border-primary bg-primary/10 text-primary hover:bg-primary/15',
      completed: 'border-success bg-success/10 text-success hover:bg-success/15',
      archived: 'border-border bg-background text-muted-foreground hover:bg-accent',
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
        <SelectTrigger className={`w-auto h-5 px-2 py-0.5 capitalize text-xs font-medium rounded-sm transition-colors ${getVariantClass(currentStatus)}`}>
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
