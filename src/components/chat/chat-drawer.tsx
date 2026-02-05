'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { MessageCircle } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ChatPanel } from './chat-panel'
import type { BlockForMention } from './chat-input'

interface Message {
  id: string
  space_id: string
  sender_user_id: string | null
  sender_email: string
  sender_name: string | null
  is_from_stakeholder: boolean
  content: string
  mentions: string[]
  mentioned_blocks: string[]
  created_at: string
}

interface SpaceMember {
  id: string
  email: string
  name: string | null
  role: string
  isStakeholder: boolean
}

interface ChatDrawerProps {
  spaceId: string
  currentUserEmail: string
  getMessages: () => Promise<{ success: true; messages: Message[] } | { success: false; error: string }>
  sendMessage: (content: string, mentions: string[], mentionedBlocks: string[]) => Promise<{ success: true; message: Message } | { success: false; error: string }>
  getMembers: () => Promise<{ success: true; members: SpaceMember[] } | { success: false; error: string }>
  getBlocks?: () => Promise<{ success: true; blocks: BlockForMention[] } | { success: false; error: string }>
  onMessagesRead?: () => void
  unreadCount?: number
  initialBlockMention?: BlockForMention
  onBlockClick?: (block: BlockForMention) => void
}

export function ChatDrawer({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  spaceId,
  currentUserEmail,
  getMessages,
  sendMessage,
  getMembers,
  getBlocks,
  onMessagesRead,
  unreadCount = 0,
  initialBlockMention,
  onBlockClick,
}: ChatDrawerProps) {
  const [open, setOpen] = useState(false)
  const [currentBlockMention, setCurrentBlockMention] = useState<BlockForMention | undefined>(initialBlockMention)
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  // Check for chat=open in URL params, and also check for block mention params
  useEffect(() => {
    if (searchParams.get('chat') === 'open') {
      // Check if there's a block mention in the URL
      const blockId = searchParams.get('chatBlock')
      const blockType = searchParams.get('chatBlockType')
      const blockTitle = searchParams.get('chatBlockTitle')

      // Use setTimeout to avoid setState synchronously within effect
      const timeoutId = setTimeout(() => {
        // If we have block info, create a BlockForMention
        if (blockId && blockType && blockTitle) {
          setCurrentBlockMention({
            id: blockId,
            type: blockType,
            title: blockTitle,
            pageId: '',
            pageSlug: '',
          })
        }

        setOpen(true)

        // Remove all chat-related params from URL
        const params = new URLSearchParams(searchParams.toString())
        params.delete('chat')
        params.delete('chatBlock')
        params.delete('chatBlockType')
        params.delete('chatBlockTitle')
        const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname
        router.replace(newUrl, { scroll: false })
      }, 0)
      return () => clearTimeout(timeoutId)
    }
  }, [searchParams, router, pathname])

  // Update current block mention when prop changes
  useEffect(() => {
    if (initialBlockMention) {
      setCurrentBlockMention(initialBlockMention)
      setOpen(true)
    }
  }, [initialBlockMention])

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (newOpen) {
      onMessagesRead?.()
    } else {
      // Clear block mention when drawer closes
      setCurrentBlockMention(undefined)
    }
  }

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleOpenChange(true)}
            className="relative"
          >
            <MessageCircle className="size-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 size-5 flex items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Messages {unreadCount > 0 && `(${unreadCount} unread)`}
        </TooltipContent>
      </Tooltip>

      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0">
          <SheetTitle className="sr-only">Chat Messages</SheetTitle>
          <ChatPanel
            currentUserEmail={currentUserEmail}
            getMessages={getMessages}
            sendMessage={sendMessage}
            getMembers={getMembers}
            getBlocks={getBlocks}
            onMessagesRead={onMessagesRead}
            initialBlockMention={currentBlockMention}
            onBlockClick={onBlockClick}
          />
        </SheetContent>
      </Sheet>
    </>
  )
}

// Re-export for convenience
export type { BlockForMention }
