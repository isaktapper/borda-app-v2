'use client'

import { useState } from 'react'
import { type Tag, createTag, updateTag, deleteTag } from '@/app/dashboard/tags/actions'
import { TagBadge } from './tag-badge'
import { TagColorPicker } from './tag-color-picker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { TAG_COLORS } from '@/lib/tag-colors'
import { toast } from 'sonner'

interface TagsManagerProps {
    tags: Tag[]
    usageCounts: Record<string, number>
}

export function TagsManager({ tags: initialTags, usageCounts }: TagsManagerProps) {
    const [tags, setTags] = useState(initialTags)
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
    const [editingTag, setEditingTag] = useState<Tag | null>(null)
    const [deletingTag, setDeletingTag] = useState<Tag | null>(null)
    const [newTagName, setNewTagName] = useState('')
    const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0].value)
    const [editTagName, setEditTagName] = useState('')
    const [editTagColor, setEditTagColor] = useState(TAG_COLORS[0].value)
    const [isLoading, setIsLoading] = useState(false)

    const handleCreateTag = async () => {
        if (!newTagName.trim()) {
            toast.error('Tag name is required')
            return
        }

        setIsLoading(true)
        const result = await createTag(newTagName.trim(), newTagColor)
        setIsLoading(false)

        if (result.error) {
            toast.error(result.error)
        } else if (result.tag) {
            toast.success('Tag created successfully')
            setTags([...tags, result.tag])
            setIsCreateDialogOpen(false)
            setNewTagName('')
            setNewTagColor(TAG_COLORS[0].value)
        }
    }

    const handleUpdateTag = async () => {
        if (!editingTag || !editTagName.trim()) {
            toast.error('Tag name is required')
            return
        }

        setIsLoading(true)
        const result = await updateTag(editingTag.id, {
            name: editTagName.trim(),
            color: editTagColor,
        })
        setIsLoading(false)

        if (result.error) {
            toast.error(result.error)
        } else if (result.tag) {
            toast.success('Tag updated successfully')
            setTags(tags.map(t => t.id === result.tag!.id ? result.tag! : t))
            setEditingTag(null)
        }
    }

    const handleDeleteTag = async () => {
        if (!deletingTag) return

        setIsLoading(true)
        const result = await deleteTag(deletingTag.id)
        setIsLoading(false)

        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success('Tag deleted successfully')
            setTags(tags.filter(t => t.id !== deletingTag.id))
            setDeletingTag(null)
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                    {tags.length} {tags.length === 1 ? 'tag' : 'taggar'}
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
                    <Plus className="size-4" />
                    Ny tagg
                </Button>
            </div>

            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-12"></TableHead>
                            <TableHead>Namn</TableHead>
                            <TableHead>Projekt</TableHead>
                            <TableHead className="w-24 text-right">Åtgärder</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tags.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                                    Inga taggar. Skapa din första tagg för att komma igång.
                                </TableCell>
                            </TableRow>
                        ) : (
                            tags.map((tag) => (
                                <TableRow key={tag.id}>
                                    <TableCell>
                                        <div
                                            className="size-4 rounded-full"
                                            style={{ backgroundColor: tag.color }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <TagBadge name={tag.name} color={tag.color} />
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {usageCounts[tag.id] || 0} {(usageCounts[tag.id] || 0) === 1 ? 'projekt' : 'projekt'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setEditingTag(tag)
                                                    setEditTagName(tag.name)
                                                    setEditTagColor(tag.color)
                                                }}
                                            >
                                                <Pencil className="size-3.5" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setDeletingTag(tag)}
                                            >
                                                <Trash2 className="size-3.5" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Create Tag Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Skapa ny tagg</DialogTitle>
                        <DialogDescription>
                            Lägg till en ny tagg för att kategorisera projekt
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Namn</label>
                            <Input
                                placeholder="t.ex. Enterprise, VIP, At Risk..."
                                value={newTagName}
                                onChange={(e) => setNewTagName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleCreateTag()
                                    }
                                }}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Färg</label>
                            <TagColorPicker
                                selectedColor={newTagColor}
                                onColorSelect={setNewTagColor}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                            Avbryt
                        </Button>
                        <Button onClick={handleCreateTag} disabled={isLoading}>
                            Skapa
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Tag Dialog */}
            <Dialog open={!!editingTag} onOpenChange={(open) => !open && setEditingTag(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Redigera tagg</DialogTitle>
                        <DialogDescription>
                            Uppdatera taggnamn eller färg
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Namn</label>
                            <Input
                                placeholder="Tag name..."
                                value={editTagName}
                                onChange={(e) => setEditTagName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleUpdateTag()
                                    }
                                }}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Färg</label>
                            <TagColorPicker
                                selectedColor={editTagColor}
                                onColorSelect={setEditTagColor}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingTag(null)}>
                            Avbryt
                        </Button>
                        <Button onClick={handleUpdateTag} disabled={isLoading}>
                            Spara
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Tag Dialog */}
            <Dialog open={!!deletingTag} onOpenChange={(open) => !open && setDeletingTag(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Ta bort tagg</DialogTitle>
                        <DialogDescription>
                            Är du säker på att du vill ta bort denna tagg?
                            {deletingTag && usageCounts[deletingTag.id] > 0 && (
                                <span className="block mt-2 text-destructive">
                                    Detta kommer att ta bort taggen från {usageCounts[deletingTag.id]} projekt.
                                </span>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeletingTag(null)}>
                            Avbryt
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteTag} disabled={isLoading}>
                            Ta bort
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
