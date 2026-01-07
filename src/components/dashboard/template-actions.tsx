'use client'

import { useState } from 'react'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { deleteTemplate, updateTemplate } from '@/app/(app)/templates/actions'
import type { Template } from '@/lib/types/templates'
import { toast } from 'sonner'

interface TemplateActionsProps {
    template: Template
}

export function TemplateActions({ template }: TemplateActionsProps) {
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [editDialogOpen, setEditDialogOpen] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [isUpdating, setIsUpdating] = useState(false)
    const [name, setName] = useState(template.name)
    const [description, setDescription] = useState(template.description || '')

    const handleDelete = async () => {
        setIsDeleting(true)
        try {
            const result = await deleteTemplate(template.id)
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success('Template deleted')
                setDeleteDialogOpen(false)
            }
        } catch (error) {
            toast.error('Failed to delete template')
        } finally {
            setIsDeleting(false)
        }
    }

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsUpdating(true)
        try {
            const result = await updateTemplate(template.id, name, description)
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success('Template updated')
                setEditDialogOpen(false)
            }
        } catch (error) {
            toast.error('Failed to update template')
        } finally {
            setIsUpdating(false)
        }
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => setDeleteDialogOpen(true)}
                        className="text-destructive"
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the template &quot;{template.name}&quot;.
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit template</DialogTitle>
                        <DialogDescription>
                            Update the name and description of this template.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleUpdate}>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={3}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setEditDialogOpen(false)}
                                disabled={isUpdating}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isUpdating}>
                                {isUpdating ? 'Saving...' : 'Save changes'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    )
}
