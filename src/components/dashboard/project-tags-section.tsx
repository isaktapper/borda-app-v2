'use client'

import { useState, useEffect } from 'react'
import { TagBadge } from './tag-badge'
import { TagPicker } from './tag-picker'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { Plus } from 'lucide-react'
import { getProjectTags, removeTagFromProject, type Tag } from '@/app/(app)/tags/actions'

interface ProjectTagsSectionProps {
    projectId: string
}

export function ProjectTagsSection({ projectId }: ProjectTagsSectionProps) {
    const [tags, setTags] = useState<Tag[]>([])
    const [isOpen, setIsOpen] = useState(false)

    const loadTags = async () => {
        const fetchedTags = await getProjectTags(projectId)
        setTags(fetchedTags)
    }

    useEffect(() => {
        loadTags()
    }, [projectId])

    const handleTagsChange = () => {
        loadTags()
        // Close the popover after a short delay to allow the user to see the change
        setTimeout(() => setIsOpen(false), 100)
    }

    const handleRemoveTag = async (tagId: string) => {
        await removeTagFromProject(projectId, tagId)
        loadTags()
    }

    return (
        <div className="flex items-center gap-2">
            {tags.map(tag => (
                <TagBadge
                    key={tag.id}
                    name={tag.name}
                    color={tag.color}
                    onRemove={() => handleRemoveTag(tag.id)}
                />
            ))}
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <div className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded-md hover:bg-muted/50 transition-colors cursor-pointer">
                        <Plus className="size-3" />
                        {tags.length === 0 ? 'Add tag' : ''}
                    </div>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-0">
                    <TagPicker
                        projectId={projectId}
                        selectedTagIds={tags.map(t => t.id)}
                        onTagsChange={handleTagsChange}
                    />
                </PopoverContent>
            </Popover>
        </div>
    )
}
