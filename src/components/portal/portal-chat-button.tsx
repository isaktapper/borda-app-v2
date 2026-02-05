'use client'

import { ChatDrawer, type BlockForMention } from '@/components/chat'
import { getPortalMessages, sendPortalMessage, getPortalSpaceMembers, getPortalBlocksForMention } from '@/app/space/chat-actions'
import { useRouter } from 'next/navigation'

interface PortalChatButtonProps {
  spaceId: string
  visitorEmail: string
}

export function PortalChatButton({
  spaceId,
  visitorEmail,
}: PortalChatButtonProps) {
  const router = useRouter()

  // Chat action handlers bound to current spaceId
  const handleGetMessages = async () => getPortalMessages(spaceId)
  const handleSendMessage = async (content: string, mentions: string[], mentionedBlocks: string[]) =>
    sendPortalMessage(spaceId, content, mentions, mentionedBlocks)
  const handleGetMembers = async () => getPortalSpaceMembers(spaceId)
  const handleGetBlocks = async () => getPortalBlocksForMention(spaceId)

  // Handle block click in chat - navigate to the block
  const handleBlockClick = (block: BlockForMention) => {
    if (block.pageSlug) {
      router.push(`/space/${spaceId}/shared/${block.pageSlug}#block-${block.id}`)
    }
  }

  return (
    <ChatDrawer
      spaceId={spaceId}
      currentUserEmail={visitorEmail}
      getMessages={handleGetMessages}
      sendMessage={handleSendMessage}
      getMembers={handleGetMembers}
      getBlocks={handleGetBlocks}
      onBlockClick={handleBlockClick}
    />
  )
}
