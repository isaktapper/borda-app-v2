'use client'

import { useState, useEffect, useRef } from 'react'
import { ChatMessages } from './chat-messages'
import { ChatInput, type BlockForMention } from './chat-input'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

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

interface ChatPanelProps {
  currentUserEmail: string
  getMessages: () => Promise<{ success: true; messages: Message[] } | { success: false; error: string }>
  sendMessage: (content: string, mentions: string[], mentionedBlocks: string[]) => Promise<{ success: true; message: Message } | { success: false; error: string }>
  getMembers: () => Promise<{ success: true; members: SpaceMember[] } | { success: false; error: string }>
  getBlocks?: () => Promise<{ success: true; blocks: BlockForMention[] } | { success: false; error: string }>
  onMessagesRead?: () => void
  initialBlockMention?: BlockForMention
  onBlockClick?: (block: BlockForMention) => void
}

export function ChatPanel({
  currentUserEmail,
  getMessages,
  sendMessage,
  getMembers,
  getBlocks,
  onMessagesRead,
  initialBlockMention,
  onBlockClick,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [members, setMembers] = useState<SpaceMember[]>([])
  const [blocks, setBlocks] = useState<BlockForMention[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Use refs to store the latest function references without triggering re-renders
  const getMessagesRef = useRef(getMessages)
  const getMembersRef = useRef(getMembers)
  const getBlocksRef = useRef(getBlocks)
  const onMessagesReadRef = useRef(onMessagesRead)
  const hasLoadedRef = useRef(false)

  // Update refs when props change
  useEffect(() => {
    getMessagesRef.current = getMessages
    getMembersRef.current = getMembers
    getBlocksRef.current = getBlocks
    onMessagesReadRef.current = onMessagesRead
  })

  // Initial load - only runs once
  useEffect(() => {
    if (hasLoadedRef.current) return
    hasLoadedRef.current = true

    const load = async () => {
      setIsLoading(true)
      const promises: Promise<any>[] = [
        getMessagesRef.current(),
        getMembersRef.current()
      ]
      if (getBlocksRef.current) {
        promises.push(getBlocksRef.current())
      }

      const results = await Promise.all(promises)
      const [messagesResult, membersResult, blocksResult] = results

      if (messagesResult.success) {
        setMessages(messagesResult.messages)
      }
      if (membersResult.success) {
        setMembers(membersResult.members)
      }
      if (blocksResult?.success) {
        setBlocks(blocksResult.blocks)
      }
      setIsLoading(false)
      // Mark as read when chat opens
      onMessagesReadRef.current?.()
    }
    load()
  }, [])

  const handleSend = async (content: string, mentions: string[], mentionedBlocks: BlockForMention[]) => {
    const mentionedBlockIds = mentionedBlocks.map(b => b.id)
    const result = await sendMessage(content, mentions, mentionedBlockIds)
    if (result.success) {
      setMessages((prev) => [...prev, result.message])
    } else {
      throw new Error(result.error)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    const result = await getMessagesRef.current()
    if (result.success) {
      setMessages(result.messages)
    }
    setIsRefreshing(false)
  }

  const handleBlockClick = (block: BlockForMention) => {
    onBlockClick?.(block)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-background">
        <div>
          <h3 className="font-semibold">Messages</h3>
          <p className="text-xs text-muted-foreground">
            Refresh to see new messages
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`size-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Messages */}
      <ChatMessages
        messages={messages}
        currentUserEmail={currentUserEmail}
        isLoading={isLoading}
        blocks={blocks}
        onBlockClick={handleBlockClick}
      />

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        members={members}
        blocks={blocks}
        disabled={isLoading}
        placeholder="Type a message... Use @ to mention someone, # to reference a block"
        initialBlockMention={initialBlockMention}
      />
    </div>
  )
}
