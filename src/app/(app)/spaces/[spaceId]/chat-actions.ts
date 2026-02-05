'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { sendChatMessageEmail, wasChatEmailSentRecently } from '@/lib/email'

export interface Message {
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

export interface BlockForMention {
  id: string
  type: string
  title: string
  pageId: string
  pageSlug: string
}

export interface SpaceMember {
  id: string
  email: string
  name: string | null
  role: 'owner' | 'collaborator' | 'stakeholder'
  isStakeholder: boolean
}

/**
 * Get all messages for a space (staff view)
 */
export async function getMessages(
  spaceId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ success: true; messages: Message[] } | { success: false; error: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('space_id', spaceId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('[getMessages] Error:', error)
    return { success: false, error: 'Could not load messages' }
  }

  return { success: true, messages: data as Message[] }
}

/**
 * Send a message in a space (staff)
 */
export async function sendMessage(
  spaceId: string,
  content: string,
  mentions: string[] = [],
  mentionedBlocks: string[] = []
): Promise<{ success: true; message: Message } | { success: false; error: string }> {
  const supabase = await createClient()
  const adminSupabase = await createAdminClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Get user profile for name
  const { data: userProfile } = await supabase
    .from('users')
    .select('full_name')
    .eq('id', user.id)
    .single()

  // Insert message
  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      space_id: spaceId,
      sender_user_id: user.id,
      sender_email: user.email!,
      sender_name: userProfile?.full_name || user.email!.split('@')[0],
      is_from_stakeholder: false,
      content,
      mentions,
      mentioned_blocks: mentionedBlocks,
    })
    .select()
    .single()

  if (error) {
    console.error('[sendMessage] Error:', error)
    return { success: false, error: 'Could not send message' }
  }

  // Get space info for notifications
  const { data: space } = await adminSupabase
    .from('spaces')
    .select('name, organization_id')
    .eq('id', spaceId)
    .single()

  if (!space) {
    return { success: true, message: message as Message }
  }

  // Send email notifications for @mentions
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.borda.work'

  for (const mentionedEmail of mentions) {
    // Rate limit: skip if we sent an email recently
    const recentlySent = await wasChatEmailSentRecently(mentionedEmail, spaceId)
    if (recentlySent) continue

    // Check if mentioned person is a stakeholder
    const { data: member } = await adminSupabase
      .from('space_members')
      .select('id, role, user_id')
      .eq('space_id', spaceId)
      .eq('invited_email', mentionedEmail)
      .single()

    // Determine link based on whether they're staff or stakeholder
    let portalLink = `${appUrl}/space/${spaceId}/shared?chat=open`
    if (member?.user_id) {
      // Staff member - link to dashboard
      portalLink = `${appUrl}/spaces/${spaceId}?tab=editor&chat=open`
    }

    await sendChatMessageEmail({
      to: mentionedEmail,
      spaceName: space.name,
      spaceId,
      organizationId: space.organization_id,
      senderName: userProfile?.full_name || user.email!.split('@')[0],
      senderEmail: user.email!,
      messagePreview: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
      portalLink,
      recipientUserId: member?.user_id,
      recipientMemberId: member?.id,
    })

    // Create notification record
    await adminSupabase.from('notifications').insert({
      recipient_user_id: member?.user_id || null,
      recipient_email: member?.user_id ? null : mentionedEmail,
      type: 'chat_message',
      space_id: spaceId,
      message_id: message.id,
      title: `New message in ${space.name}`,
      body: content.substring(0, 100),
      link: portalLink,
      email_sent_at: new Date().toISOString(),
    })
  }

  return { success: true, message: message as Message }
}

/**
 * Get all members of a space for @mention autocomplete
 */
export async function getSpaceMembers(
  spaceId: string
): Promise<{ success: true; members: SpaceMember[] } | { success: false; error: string }> {
  const supabase = await createClient()
  const adminSupabase = await createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Get space to check organization
  const { data: space } = await supabase
    .from('spaces')
    .select('organization_id')
    .eq('id', spaceId)
    .single()

  if (!space) {
    return { success: false, error: 'Space not found' }
  }

  // Get organization members (staff)
  const { data: orgMembers } = await supabase
    .from('organization_members')
    .select(`
      user_id,
      users:user_id (
        id,
        email,
        full_name
      )
    `)
    .eq('organization_id', space.organization_id)

  // Get space stakeholders
  const { data: stakeholders } = await adminSupabase
    .from('space_members')
    .select('id, invited_email, name, role')
    .eq('space_id', spaceId)
    .eq('role', 'stakeholder')
    .is('deleted_at', null)

  const members: SpaceMember[] = []

  // Add org members (staff)
  if (orgMembers) {
    for (const om of orgMembers) {
      const u = om.users as unknown as { id: string; email: string; full_name: string | null } | null
      if (u && u.email && u.email !== user.email) {
        members.push({
          id: u.id,
          email: u.email,
          name: u.full_name,
          role: 'collaborator',
          isStakeholder: false,
        })
      }
    }
  }

  // Add stakeholders
  if (stakeholders) {
    for (const s of stakeholders) {
      if (s.invited_email) {
        members.push({
          id: s.id,
          email: s.invited_email,
          name: s.name,
          role: 'stakeholder',
          isStakeholder: true,
        })
      }
    }
  }

  return { success: true, members }
}

/**
 * Delete a message (soft delete)
 */
export async function deleteMessage(
  messageId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('messages')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', messageId)

  if (error) {
    console.error('[deleteMessage] Error:', error)
    return { success: false, error: 'Could not delete message' }
  }

  return { success: true }
}

/**
 * Get all blocks in a space for #mention autocomplete (staff view)
 */
export async function getBlocksForMention(
  spaceId: string
): Promise<{ success: true; blocks: BlockForMention[] } | { success: false; error: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Get all pages for this space
  const { data: pages, error: pagesError } = await supabase
    .from('pages')
    .select('id, slug')
    .eq('space_id', spaceId)
    .is('deleted_at', null)

  if (pagesError || !pages || pages.length === 0) {
    return { success: true, blocks: [] }
  }

  const pageIds = pages.map(p => p.id)
  const pageSlugMap = new Map(pages.map(p => [p.id, p.slug]))

  // Get all blocks from those pages
  const { data: blocks, error: blocksError } = await supabase
    .from('blocks')
    .select('id, type, content, page_id')
    .in('page_id', pageIds)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })

  if (blocksError) {
    console.error('[getBlocksForMention] Error:', blocksError)
    return { success: false, error: 'Could not load blocks' }
  }

  // Transform blocks to BlockForMention format
  const blocksForMention: BlockForMention[] = (blocks || []).map(block => ({
    id: block.id,
    type: block.type,
    title: getBlockTitle(block.type, block.content),
    pageId: block.page_id,
    pageSlug: pageSlugMap.get(block.page_id) || '',
  }))

  return { success: true, blocks: blocksForMention }
}

/**
 * Extract a human-readable title from block content
 */
function getBlockTitle(type: string, content: any): string {
  if (!content) return getDefaultBlockTitle(type)

  switch (type) {
    case 'text':
      // Strip HTML and take first 40 chars
      if (content.html) {
        const text = content.html.replace(/<[^>]*>/g, '').trim()
        return text.slice(0, 40) || 'Text block'
      }
      return content.text?.slice(0, 40) || 'Text block'

    case 'action_plan':
      return content.title || 'Action plan'

    case 'form':
      return content.title || 'Form'

    case 'file_upload':
      return content.label || 'File upload'

    case 'file_download':
      return content.title || 'File download'

    case 'embed':
      return content.title || 'Embed'

    case 'contact':
      return content.name || 'Contact'

    case 'accordion':
      return content.title || 'Accordion'

    case 'timeline':
      return content.title || 'Timeline'

    case 'media':
      return content.caption || 'Media'

    case 'next_task':
      return content.title || 'Next task'

    case 'action_plan_progress':
      return content.title || 'Progress'

    case 'divider':
      return 'Divider'

    case 'task':
      return content.title || 'Task'

    default:
      return getDefaultBlockTitle(type)
  }
}

function getDefaultBlockTitle(type: string): string {
  const titles: Record<string, string> = {
    text: 'Text block',
    action_plan: 'Action plan',
    form: 'Form',
    file_upload: 'File upload',
    file_download: 'File download',
    embed: 'Embed',
    contact: 'Contact',
    accordion: 'Accordion',
    timeline: 'Timeline',
    media: 'Media',
    next_task: 'Next task',
    action_plan_progress: 'Progress',
    divider: 'Divider',
    task: 'Task',
  }
  return titles[type] || `${type} block`
}
