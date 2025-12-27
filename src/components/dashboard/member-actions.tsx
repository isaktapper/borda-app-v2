'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { MoreVertical, Shield, Trash2, Mail } from 'lucide-react'
import { updateOrgMemberRole, removeOrgMember, resendInvitation } from '@/app/dashboard/settings/team-actions'
import { toast } from 'sonner'

interface MemberActionsProps {
  memberId: string
  currentRole: string
  userRole: string
  isPending?: boolean
}

export function MemberActions({ memberId, currentRole, userRole, isPending = false }: MemberActionsProps) {
  const [showRemoveDialog, setShowRemoveDialog] = useState(false)
  const [showRoleDialog, setShowRoleDialog] = useState(false)
  const [newRole, setNewRole] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const canChangeRole =
    userRole === 'owner' ||
    (userRole === 'admin' && currentRole !== 'owner')

  const canRemove = userRole === 'owner' || userRole === 'admin'

  const handleChangeRole = async (role: string) => {
    setNewRole(role)
    setShowRoleDialog(true)
  }

  const confirmChangeRole = async () => {
    setLoading(true)
    const result = await updateOrgMemberRole(memberId, newRole as any)
    setLoading(false)
    setShowRoleDialog(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Roll uppdaterad')
    }
  }

  const confirmRemove = async () => {
    setLoading(true)
    const result = await removeOrgMember(memberId)
    setLoading(false)
    setShowRemoveDialog(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(isPending ? 'Inbjudan borttagen' : 'Medlem borttagen')
    }
  }

  const handleResend = async () => {
    const result = await resendInvitation(memberId)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Inbjudan skickad igen')
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Åtgärder</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {isPending && (
            <DropdownMenuItem onClick={handleResend}>
              <Mail className="size-4 mr-2" />
              Skicka igen
            </DropdownMenuItem>
          )}

          {!isPending && canChangeRole && (
            <>
              {currentRole !== 'member' && (
                <DropdownMenuItem onClick={() => handleChangeRole('member')}>
                  <Shield className="size-4 mr-2" />
                  Gör till Member
                </DropdownMenuItem>
              )}
              {currentRole !== 'admin' && userRole === 'owner' && (
                <DropdownMenuItem onClick={() => handleChangeRole('admin')}>
                  <Shield className="size-4 mr-2" />
                  Gör till Admin
                </DropdownMenuItem>
              )}
              {currentRole !== 'owner' && userRole === 'owner' && (
                <DropdownMenuItem onClick={() => handleChangeRole('owner')}>
                  <Shield className="size-4 mr-2" />
                  Gör till Owner
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
            </>
          )}

          {canRemove && (
            <DropdownMenuItem
              onClick={() => setShowRemoveDialog(true)}
              className="text-red-600"
            >
              <Trash2 className="size-4 mr-2" />
              {isPending ? 'Ta bort inbjudan' : 'Ta bort medlem'}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Change Role Dialog */}
      <AlertDialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ändra roll</AlertDialogTitle>
            <AlertDialogDescription>
              Är du säker på att du vill ändra rollen till <strong>{newRole}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={confirmChangeRole} disabled={loading}>
              Ändra roll
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Member Dialog */}
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isPending ? 'Ta bort inbjudan' : 'Ta bort medlem'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isPending
                ? 'Är du säker på att du vill ta bort denna inbjudan?'
                : 'Är du säker på att du vill ta bort denna medlem från organisationen?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemove}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700"
            >
              {isPending ? 'Ta bort inbjudan' : 'Ta bort medlem'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
