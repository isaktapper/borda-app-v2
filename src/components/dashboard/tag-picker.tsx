'use client'

import { useState, useEffect, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getTags, addTagToProject, removeTagFromProject, createAndAddTag, type Tag } from '@/app/(app)/tags/actions'
import { TagColorPicker } from './tag-color-picker'
import { TAG_COLORS } from '@/lib/tag-colors'

interface TagPickerProps {
  spaceId: string
  selectedTagIds: string[]
  onTagsChange?: () => void
  className?: string
}

export function TagPicker({ spaceId, selectedTagIds, onTagsChange, className }: TagPickerProps) {
  const [search, setSearch] = useState('')
  const [tags, setTags] = useState<Tag[]>([])
  const [creatingTag, setCreatingTag] = useState(false)
  const [newTagColor, setNewTagColor] = useState<string>(TAG_COLORS[0].value)
  const [isLoading, setIsLoading] = useState(false)

  // Load tags on mount
  useEffect(() => {
    loadTags()
  }, [])

  const loadTags = async () => {
    const fetchedTags = await getTags()
    setTags(fetchedTags)
  }

  // Filter tags based on search
  const filteredTags = useMemo(() => {
    if (!search) return tags
    return tags.filter(tag =>
      tag.name.toLowerCase().includes(search.toLowerCase())
    )
  }, [tags, search])

  // Check if search term matches existing tag
  const exactMatch = useMemo(() => {
    return tags.some(tag => tag.name.toLowerCase() === search.toLowerCase())
  }, [tags, search])

  // Show "Create new tag" option if search doesn't match
  const showCreateOption = search.length > 0 && !exactMatch && !creatingTag

  const handleToggleTag = async (tagId: string, isSelected: boolean) => {
    setIsLoading(true)

    if (isSelected) {
      await removeTagFromProject(spaceId, tagId)
    } else {
      await addTagToProject(spaceId, tagId)
    }

    setIsLoading(false)
    onTagsChange?.()
  }

  const handleCreateTag = async () => {
    if (!search.trim()) return

    setIsLoading(true)
    const result = await createAndAddTag(spaceId, search.trim(), newTagColor)

    if (result.success) {
      await loadTags()
      setSearch('')
      setCreatingTag(false)
      setNewTagColor(TAG_COLORS[0].value)
      onTagsChange?.()
    }

    setIsLoading(false)
  }

  return (
    <div className={cn('w-80 p-3', className)}>
      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search tags..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      {/* Tags list */}
      <div className="max-h-[280px] overflow-y-auto space-y-1 mb-3">
        {filteredTags.length === 0 && !showCreateOption && (
          <div className="text-sm text-muted-foreground text-center py-6">
            No tags found
          </div>
        )}

        {filteredTags.map((tag) => {
          const isSelected = selectedTagIds.includes(tag.id)

          return (
            <div
              key={tag.id}
              onClick={() => !isLoading && handleToggleTag(tag.id, isSelected)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted/50 transition-colors text-left cursor-pointer"
            >
              <div
                className="size-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: tag.color }}
              />
              <span className="flex-1 text-sm">{tag.name}</span>
              <Checkbox checked={isSelected} className="pointer-events-none" />
            </div>
          )
        })}
      </div>

      {/* Create new tag */}
      {showCreateOption && !creatingTag && (
        <button
          type="button"
          onClick={() => setCreatingTag(true)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted/50 transition-colors text-left border-t"
        >
          <Plus className="size-4 text-muted-foreground" />
          <span className="text-sm">
            Create <span className="font-medium">"{search}"</span>
          </span>
        </button>
      )}

      {/* Create tag UI */}
      {creatingTag && (
        <div className="border-t pt-3 space-y-3">
          <div className="px-3">
            <p className="text-sm font-medium mb-2">Choose a color:</p>
            <TagColorPicker
              selectedColor={newTagColor}
              onColorSelect={setNewTagColor}
            />
          </div>
          <div className="flex gap-2 px-3">
            <button
              type="button"
              onClick={() => {
                setCreatingTag(false)
                setNewTagColor(TAG_COLORS[0].value)
              }}
              className="flex-1 px-3 py-1.5 text-sm border rounded-md hover:bg-muted/50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreateTag}
              disabled={isLoading}
              className="flex-1 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              Create & Add
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
