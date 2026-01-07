'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus } from 'lucide-react'
import { createPage } from '@/app/(app)/projects/[projectId]/pages-actions'

interface CreatePageModalProps {
    projectId: string
    onPageCreated?: (newPage: any) => void
}

export function CreatePageModal({ projectId, onPageCreated }: CreatePageModalProps) {
    const [open, setOpen] = useState(false)
    const [title, setTitle] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const result = await createPage(projectId, title)

        if (result.success && result.page) {
            setOpen(false)
            setTitle('')
            setLoading(false)
            onPageCreated?.(result.page)
            router.refresh()
        } else {
            setError(result.error || 'Failed to create page')
            setLoading(false)
        }
    }

    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen)
        if (!newOpen) {
            // Reset state when closing
            setTitle('')
            setLoading(false)
            setError(null)
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="size-6">
                    <Plus className="size-4" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Add New Page</DialogTitle>
                        <DialogDescription>
                            Create a new page for your project. You can add content later.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="title">Page Title</Label>
                            <Input
                                id="title"
                                placeholder="e.g. Overview, Tasks, Feedback"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                            />
                        </div>
                        {error && (
                            <p className="text-sm text-destructive">{error}</p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Creating...' : 'Create Page'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
