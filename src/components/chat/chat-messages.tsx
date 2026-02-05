'use client'

import { useRef, useEffect } from 'react'
import { ChatMessage } from './chat-message'
import { Loader2 } from 'lucide-react'
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

interface ChatMessagesProps {
  messages: Message[]
  currentUserEmail: string
  isLoading?: boolean
  blocks?: BlockForMention[]
  onBlockClick?: (block: BlockForMention) => void
}

export function ChatMessages({
  messages,
  currentUserEmail,
  isLoading,
  blocks = [],
  onBlockClick
}: ChatMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
        <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-6 text-muted-foreground"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <h3 className="font-medium text-sm mb-1">No messages yet</h3>
        <p className="text-xs text-muted-foreground">
          Start the conversation by sending a message.
        </p>
      </div>
    )
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
      <div className="flex flex-col gap-4">
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            isOwnMessage={message.sender_email === currentUserEmail}
            blocks={blocks}
            onBlockClick={onBlockClick}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  )
}
