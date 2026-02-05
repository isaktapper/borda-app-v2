'use client'

import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { FileText, ListChecks, Upload, Download, Video, User, LayoutList, Clock, Image, ChevronRight, BarChart3, Hash } from 'lucide-react'
import type { BlockForMention } from './chat-input'

interface Message {
  id: string
  sender_email: string
  sender_name: string | null
  is_from_stakeholder: boolean
  content: string
  mentions: string[]
  mentioned_blocks: string[]
  created_at: string
}

interface ChatMessageProps {
  message: Message
  isOwnMessage: boolean
  blocks?: BlockForMention[]
  onBlockClick?: (block: BlockForMention) => void
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

export function ChatMessage({ message, isOwnMessage, blocks = [], onBlockClick }: ChatMessageProps) {
  const displayName = message.sender_name || message.sender_email.split('@')[0]
  const initials = displayName.slice(0, 2).toUpperCase()
  const timestamp = format(new Date(message.created_at), 'HH:mm')

  // Highlight @mentions and #block-mentions in the content
  const renderContent = (text: string, isOwn: boolean) => {
    // First, find all @email mentions
    const emailPattern = /@[\w.-]+@[\w.-]+\.\w+/g

    // Split text into segments for rendering
    const segments: Array<{
      type: 'text' | 'email-mention' | 'block-mention'
      content: string
      block?: BlockForMention
    }> = []

    let lastIndex = 0
    let workingText = text

    // First pass: identify email mentions
    const emailMatches: Array<{ index: number; length: number; content: string }> = []
    let emailMatch
    while ((emailMatch = emailPattern.exec(text)) !== null) {
      emailMatches.push({
        index: emailMatch.index,
        length: emailMatch[0].length,
        content: emailMatch[0]
      })
    }

    // Second pass: identify block mentions
    const blockMatches: Array<{ index: number; length: number; content: string; block: BlockForMention }> = []
    for (const block of blocks) {
      const pattern = `#${block.title}`
      let searchIndex = 0
      while (true) {
        const foundIndex = text.indexOf(pattern, searchIndex)
        if (foundIndex === -1) break

        // Make sure it's followed by space/end or punctuation
        const endIndex = foundIndex + pattern.length
        const nextChar = text[endIndex]
        if (!nextChar || /[\s.,!?;:)]/.test(nextChar)) {
          blockMatches.push({
            index: foundIndex,
            length: pattern.length,
            content: pattern,
            block
          })
        }
        searchIndex = foundIndex + 1
      }
    }

    // Combine and sort all matches by index
    const allMatches = [
      ...emailMatches.map(m => ({ ...m, type: 'email-mention' as const })),
      ...blockMatches.map(m => ({ ...m, type: 'block-mention' as const }))
    ].sort((a, b) => a.index - b.index)

    // Remove overlapping matches (keep the first one)
    const filteredMatches: typeof allMatches = []
    let lastEnd = -1
    for (const match of allMatches) {
      if (match.index >= lastEnd) {
        filteredMatches.push(match)
        lastEnd = match.index + match.length
      }
    }

    // Build segments
    let currentIndex = 0
    for (const match of filteredMatches) {
      // Add text before the match
      if (match.index > currentIndex) {
        segments.push({
          type: 'text',
          content: text.slice(currentIndex, match.index)
        })
      }

      // Add the match
      if (match.type === 'email-mention') {
        segments.push({
          type: 'email-mention',
          content: match.content
        })
      } else if (match.type === 'block-mention') {
        segments.push({
          type: 'block-mention',
          content: match.content,
          block: (match as { block: BlockForMention }).block
        })
      }

      currentIndex = match.index + match.length
    }

    // Add remaining text
    if (currentIndex < text.length) {
      segments.push({
        type: 'text',
        content: text.slice(currentIndex)
      })
    }

    // Render segments
    return segments.map((segment, i) => {
      if (segment.type === 'email-mention') {
        return (
          <span
            key={i}
            className={cn(
              'font-medium',
              isOwn ? 'text-primary-foreground underline' : 'text-primary'
            )}
          >
            {segment.content}
          </span>
        )
      }

      if (segment.type === 'block-mention' && segment.block) {
        const Icon = getBlockIcon(segment.block.type)
        return (
          <button
            key={i}
            type="button"
            onClick={() => onBlockClick?.(segment.block!)}
            className={cn(
              'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium transition-colors',
              isOwn
                ? 'bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30'
                : 'bg-violet-100 text-violet-700 hover:bg-violet-200'
            )}
          >
            <Icon className="size-3" />
            <span>{segment.block.title}</span>
          </button>
        )
      }

      return segment.content
    })
  }

  return (
    <div
      className={cn(
        'flex gap-3 group',
        isOwnMessage && 'flex-row-reverse'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 size-8 rounded-full flex items-center justify-center text-xs font-medium',
          message.is_from_stakeholder
            ? 'bg-orange-100 text-orange-700'
            : 'bg-blue-100 text-blue-700'
        )}
      >
        {initials}
      </div>

      {/* Message content */}
      <div className={cn('flex flex-col', isOwnMessage && 'items-end')}>
        <div className={cn('flex items-baseline gap-2 mb-1', isOwnMessage && 'flex-row-reverse')}>
          <span className="text-sm font-medium text-foreground">{displayName}</span>
          <span className="text-xs text-muted-foreground">{timestamp}</span>
          {message.is_from_stakeholder && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">
              Stakeholder
            </span>
          )}
        </div>

        <div
          className={cn(
            'rounded-lg px-3 py-2 text-sm max-w-[75%] w-fit',
            isOwnMessage
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted'
          )}
        >
          <p className="whitespace-pre-wrap break-words">
            {renderContent(message.content, isOwnMessage)}
          </p>
        </div>
      </div>
    </div>
  )
}
