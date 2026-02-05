'use client'

import { MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { BlockForMention } from '@/components/chat/chat-input'

interface BlockChatButtonProps {
  block: BlockForMention
  onChatClick: (block: BlockForMention) => void
}

/**
 * A chat button that appears on block hover
 * Clicking opens the chat drawer with the block pre-tagged
 */
export function BlockChatButton({ block, onChatClick }: BlockChatButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 bg-white/90 hover:bg-white shadow-sm border border-border/50"
          onClick={(e) => {
            e.stopPropagation()
            onChatClick(block)
          }}
        >
          <MessageCircle className="size-3.5 text-muted-foreground" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="left">
        <p>Ask about this block</p>
      </TooltipContent>
    </Tooltip>
  )
}
