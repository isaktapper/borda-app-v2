'use client'

import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, Loader2, FileText, ListChecks, Upload, Download, Video, User, LayoutList, Clock, Image, ChevronRight, BarChart3, Hash } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SpaceMember {
  id: string
  email: string
  name: string | null
  role: string
  isStakeholder: boolean
}

export interface BlockForMention {
  id: string
  type: string
  title: string
  pageId: string
  pageSlug: string
}

interface ChatInputProps {
  onSend: (content: string, mentions: string[], mentionedBlocks: BlockForMention[]) => Promise<void>
  members: SpaceMember[]
  blocks?: BlockForMention[]
  disabled?: boolean
  placeholder?: string
  initialBlockMention?: BlockForMention
}

// Map block types to icons
function getBlockIcon(type: string) {
  const icons: Record<string, typeof FileText> = {
    text: FileText,
    action_plan: ListChecks,
    form: ListChecks,
    file_upload: Upload,
    file_download: Download,
    embed: Video,
    contact: User,
    accordion: LayoutList,
    timeline: Clock,
    media: Image,
    next_task: ChevronRight,
    action_plan_progress: BarChart3,
    task: ListChecks,
    divider: Hash,
  }
  return icons[type] || FileText
}

export function ChatInput({
  onSend,
  members,
  blocks = [],
  disabled,
  placeholder = 'Type a message...',
  initialBlockMention,
}: ChatInputProps) {
  const [content, setContent] = useState('')
  const [isSending, setIsSending] = useState(false)

  // Person mention state (@)
  const [showMentions, setShowMentions] = useState(false)
  const [mentionFilter, setMentionFilter] = useState('')
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0)

  // Block mention state (#)
  const [showBlockMentions, setShowBlockMentions] = useState(false)
  const [blockMentionFilter, setBlockMentionFilter] = useState('')
  const [selectedBlockIndex, setSelectedBlockIndex] = useState(0)

  // Track selected blocks for this message
  const [selectedBlocks, setSelectedBlocks] = useState<BlockForMention[]>([])

  const [cursorPosition, setCursorPosition] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const mentionsRef = useRef<HTMLDivElement>(null)
  const blockMentionsRef = useRef<HTMLDivElement>(null)
  const initialBlockApplied = useRef(false)

  // Handle initial block mention (from hover button)
  useEffect(() => {
    if (initialBlockMention && !initialBlockApplied.current) {
      initialBlockApplied.current = true
      setSelectedBlocks([initialBlockMention])
      setContent(`#${initialBlockMention.title} `)
      // Focus textarea
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus()
          const pos = initialBlockMention.title.length + 2
          textareaRef.current.setSelectionRange(pos, pos)
        }
      }, 100)
    }
  }, [initialBlockMention])

  // Filter members based on mention filter
  const filteredMembers = members.filter((m) =>
    m.email.toLowerCase().includes(mentionFilter.toLowerCase()) ||
    (m.name && m.name.toLowerCase().includes(mentionFilter.toLowerCase()))
  )

  // Filter blocks based on block mention filter
  const filteredBlocks = blocks.filter((b) =>
    b.title.toLowerCase().includes(blockMentionFilter.toLowerCase()) ||
    b.type.toLowerCase().includes(blockMentionFilter.toLowerCase())
  )

  // Extract mentioned emails from content
  const extractMentions = (text: string): string[] => {
    const mentions: string[] = []
    const regex = /@([\w.-]+@[\w.-]+\.\w+)/g
    let match
    while ((match = regex.exec(text)) !== null) {
      mentions.push(match[1])
    }
    return mentions
  }

  const handleSend = async () => {
    if (!content.trim() || isSending || disabled) return

    setIsSending(true)
    try {
      const mentions = extractMentions(content)
      await onSend(content.trim(), mentions, selectedBlocks)
      setContent('')
      setSelectedBlocks([])
      initialBlockApplied.current = false
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle block mentions dropdown
    if (showBlockMentions && filteredBlocks.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedBlockIndex((prev) =>
          prev < filteredBlocks.length - 1 ? prev + 1 : 0
        )
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedBlockIndex((prev) =>
          prev > 0 ? prev - 1 : filteredBlocks.length - 1
        )
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        insertBlockMention(filteredBlocks[selectedBlockIndex])
        return
      }
      if (e.key === 'Escape') {
        setShowBlockMentions(false)
        return
      }
    }

    // Handle person mentions dropdown
    if (showMentions && filteredMembers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedMentionIndex((prev) =>
          prev < filteredMembers.length - 1 ? prev + 1 : 0
        )
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedMentionIndex((prev) =>
          prev > 0 ? prev - 1 : filteredMembers.length - 1
        )
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        insertMention(filteredMembers[selectedMentionIndex])
        return
      }
      if (e.key === 'Escape') {
        setShowMentions(false)
        return
      }
    }

    // Send on Enter (without shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value
    const cursor = e.target.selectionStart || 0
    setContent(newContent)
    setCursorPosition(cursor)

    const textBeforeCursor = newContent.slice(0, cursor)

    // Check for # block mention trigger (prioritize this)
    const lastHashIndex = textBeforeCursor.lastIndexOf('#')
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')

    // Determine which trigger is closer to cursor
    if (lastHashIndex > lastAtIndex && lastHashIndex !== -1) {
      const textAfterHash = textBeforeCursor.slice(lastHashIndex + 1)
      // Show block mentions if there's a # and no space after it
      if (!textAfterHash.includes(' ') && !textAfterHash.includes('\n')) {
        setBlockMentionFilter(textAfterHash)
        setShowBlockMentions(true)
        setSelectedBlockIndex(0)
        setShowMentions(false)
        return
      }
    }

    // Check for @ mention trigger
    if (lastAtIndex !== -1 && lastAtIndex > lastHashIndex) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1)
      // Show mentions if there's an @ and no space after it
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        setMentionFilter(textAfterAt)
        setShowMentions(true)
        setSelectedMentionIndex(0)
        setShowBlockMentions(false)
        return
      }
    }

    setShowMentions(false)
    setShowBlockMentions(false)
  }

  const insertMention = (member: SpaceMember) => {
    const textBeforeCursor = content.slice(0, cursorPosition)
    const textAfterCursor = content.slice(cursorPosition)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')

    if (lastAtIndex !== -1) {
      const newContent =
        textBeforeCursor.slice(0, lastAtIndex) +
        `@${member.email} ` +
        textAfterCursor

      setContent(newContent)
      setShowMentions(false)

      // Focus and move cursor
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus()
          const newPosition = lastAtIndex + member.email.length + 2
          textareaRef.current.setSelectionRange(newPosition, newPosition)
        }
      }, 0)
    }
  }

  const insertBlockMention = (block: BlockForMention) => {
    const textBeforeCursor = content.slice(0, cursorPosition)
    const textAfterCursor = content.slice(cursorPosition)
    const lastHashIndex = textBeforeCursor.lastIndexOf('#')

    if (lastHashIndex !== -1) {
      const newContent =
        textBeforeCursor.slice(0, lastHashIndex) +
        `#${block.title} ` +
        textAfterCursor

      setContent(newContent)
      setShowBlockMentions(false)

      // Add block to selected blocks if not already added
      if (!selectedBlocks.find(b => b.id === block.id)) {
        setSelectedBlocks(prev => [...prev, block])
      }

      // Focus and move cursor
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus()
          const newPosition = lastHashIndex + block.title.length + 2
          textareaRef.current.setSelectionRange(newPosition, newPosition)
        }
      }, 0)
    }
  }

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (mentionsRef.current && !mentionsRef.current.contains(e.target as Node)) {
        setShowMentions(false)
      }
      if (blockMentionsRef.current && !blockMentionsRef.current.contains(e.target as Node)) {
        setShowBlockMentions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative border-t bg-background p-4">
      {/* Person mention autocomplete dropdown */}
      {showMentions && filteredMembers.length > 0 && (
        <div
          ref={mentionsRef}
          className="absolute bottom-full left-4 right-4 mb-2 bg-popover border rounded-lg shadow-lg max-h-48 overflow-y-auto z-10"
        >
          {filteredMembers.map((member, index) => (
            <button
              key={member.id}
              type="button"
              className={cn(
                'w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-muted transition-colors',
                index === selectedMentionIndex && 'bg-muted'
              )}
              onClick={() => insertMention(member)}
            >
              <div
                className={cn(
                  'size-6 rounded-full flex items-center justify-center text-xs font-medium',
                  member.isStakeholder
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-blue-100 text-blue-700'
                )}
              >
                {(member.name || member.email).slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {member.name || member.email.split('@')[0]}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {member.email}
                </p>
              </div>
              {member.isStakeholder && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 shrink-0">
                  Stakeholder
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Block mention autocomplete dropdown */}
      {showBlockMentions && filteredBlocks.length > 0 && (
        <div
          ref={blockMentionsRef}
          className="absolute bottom-full left-4 right-4 mb-2 bg-popover border rounded-lg shadow-lg max-h-48 overflow-y-auto z-10"
        >
          {filteredBlocks.map((block, index) => {
            const Icon = getBlockIcon(block.type)
            return (
              <button
                key={block.id}
                type="button"
                className={cn(
                  'w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-muted transition-colors',
                  index === selectedBlockIndex && 'bg-muted'
                )}
                onClick={() => insertBlockMention(block)}
              >
                <div className="size-6 rounded flex items-center justify-center bg-violet-100 text-violet-700">
                  <Icon className="size-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {block.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate capitalize">
                    {block.type.replace(/_/g, ' ')}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      )}

      <div className="flex items-end gap-2">
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isSending}
          rows={1}
          className="min-h-[40px] max-h-32 resize-none"
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!content.trim() || isSending || disabled}
        >
          {isSending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground mt-2">
        Type @ to mention someone, # to reference a block.
      </p>
    </div>
  )
}
