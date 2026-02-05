'use server'

import { createAdminClient, createClient } from '@/lib/supabase/server'
import { verifyPortalSession } from '@/lib/portal-auth'
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
 * Get authenticated portal client for chat operations
 */
async function getAuthPortalClient(spaceId: string) {
  // 1. Check if internal staff (Supabase user)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: membership } = await supabase
      .from('space_members')
      .select('id')
      .eq('space_id', spaceId)
      .single()

    if (membership) {
      return { client: supabase, isStaff: true, email: user.email!, name: null, userId: user.id }
    }
  }

  // 2. For non-staff, require portal session
  const session = await verifyPortalSession(spaceId)
  if (!session) {
    return null
  }

  // 3. Use admin client for portal users
  const adminSupabase = await createAdminClient()

  // Get member info
  const { data: member } = await adminSupabase
    .from('space_members')
    .select('id, name, invited_email')
    .eq('space_id', spaceId)
    .eq('invited_email', session.email)
    .single()

  return {
    client: adminSupabase,
    isStaff: false,
    email: session.email,
    name: member?.name || session.email.split('@')[0],
    userId: null,
  }
}

/**
 * Get all messages for a space (portal view)
 */
export async function getPortalMessages(
  spaceId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ success: true; messages: Message[] } | { success: false; error: string }> {
  const auth = await getAuthPortalClient(spaceId)
  if (!auth) {
    return { success: false, error: 'Not authorized' }
  }

  const { data, error } = await auth.client
    .from('messages')
    .select('*')
    .eq('space_id', spaceId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('[getPortalMessages] Error:', error)
    return { success: false, error: 'Could not load messages' }
  }

  return { success: true, messages: data as Message[] }
}

/**
 * Send a message from the portal (stakeholder)
 */
export async function sendPortalMessage(
  spaceId: string,
  content: string,
  mentions: string[] = [],
  mentionedBlocks: string[] = []
): Promise<{ success: true; message: Message } | { success: false; error: string }> {
  const auth = await getAuthPortalClient(spaceId)
  if (!auth) {
    return { success: false, error: 'Not authorized' }
  }

  const adminSupabase = await createAdminClient()

  // Insert message
  const { data: message, error } = await adminSupabase
    .from('messages')
    .insert({
      space_id: spaceId,
      sender_user_id: auth.userId,
      sender_email: auth.email,
      sender_name: auth.name,
      is_from_stakeholder: !auth.isStaff,
      content,
      mentions,
      mentioned_blocks: mentionedBlocks,
    })
    .select()
    .single()

  if (error) {
    console.error('[sendPortalMessage] Error:', error)
    return { success: false, error: 'Could not send message' }
  }

  // Get space info for notifications
  const { data: space } = await adminSupabase
    .from('spaces')
    .select('name, organization_id, assigned_to')
    .eq('id', spaceId)
    .single()

  if (!space) {
    return { success: true, message: message as Message }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.borda.work'

  // If message is from stakeholder, notify space owner
  if (!auth.isStaff) {
    // Get space owner (created_by or first owner member)
    const { data: spaceData } = await adminSupabase
      .from('spaces')
      .select('created_by')
      .eq('id', spaceId)
      .single()

    if (spaceData?.created_by) {
      const { data: owner } = await adminSupabase
        .from('users')
        .select('email')
        .eq('id', spaceData.created_by)
        .single()

      if (owner?.email) {
        // Rate limit check
        const recentlySent = await wasChatEmailSentRecently(owner.email, spaceId)
        if (!recentlySent) {
          await sendChatMessageEmail({
            to: owner.email,
            spaceName: space.name,
            spaceId,
            organizationId: space.organization_id,
            senderName: auth.name || auth.email,
            senderEmail: auth.email,
            messagePreview: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
            portalLink: `${appUrl}/spaces/${spaceId}?tab=editor&chat=open`,
            recipientUserId: spaceData.created_by,
          })

          // Create notification
          await adminSupabase.from('notifications').insert({
            recipient_user_id: spaceData.created_by,
            type: 'chat_message',
            space_id: spaceId,
            message_id: message.id,
            title: `New message in ${space.name}`,
            body: content.substring(0, 100),
            link: `${appUrl}/spaces/${spaceId}?tab=editor&chat=open`,
            email_sent_at: new Date().toISOString(),
          })
        }
      }
    }
  }

  // Send notifications for @mentions
  for (const mentionedEmail of mentions) {
    // Rate limit check
    const recentlySent = await wasChatEmailSentRecently(mentionedEmail, spaceId)
    if (recentlySent) continue

    // Check if mentioned person is staff or stakeholder
    const { data: staffMember } = await adminSupabase
      .from('users')
      .select('id, email')
      .eq('email', mentionedEmail)
      .single()

    const { data: stakeholderMember } = await adminSupabase
      .from('space_members')
      .select('id, role')
      .eq('space_id', spaceId)
      .eq('invited_email', mentionedEmail)
      .single()

    // Determine the correct link
    let portalLink = `${appUrl}/space/${spaceId}/shared?chat=open`
    if (staffMember) {
      portalLink = `${appUrl}/spaces/${spaceId}?tab=editor&chat=open`
    }

    await sendChatMessageEmail({
      to: mentionedEmail,
      spaceName: space.name,
      spaceId,
      organizationId: space.organization_id,
      senderName: auth.name || auth.email,
      senderEmail: auth.email,
      messagePreview: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
      portalLink,
      recipientUserId: staffMember?.id,
      recipientMemberId: stakeholderMember?.id,
    })

    // Create notification
    await adminSupabase.from('notifications').insert({
      recipient_user_id: staffMember?.id || null,
      recipient_email: staffMember ? null : mentionedEmail,
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
 * Get members for @mention autocomplete (portal view)
 */
export async function getPortalSpaceMembers(
  spaceId: string
): Promise<{ success: true; members: SpaceMember[] } | { success: false; error: string }> {
  const auth = await getAuthPortalClient(spaceId)
  if (!auth) {
    return { success: false, error: 'Not authorized' }
  }

  const adminSupabase = await createAdminClient()

  // Get space info
  const { data: space } = await adminSupabase
    .from('spaces')
    .select('organization_id')
    .eq('id', spaceId)
    .single()

  if (!space) {
    return { success: false, error: 'Space not found' }
  }

  // Get organization members (staff)
  const { data: orgMembers } = await adminSupabase
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
      if (u && u.email && u.email !== auth.email) {
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

  // Add stakeholders (excluding current user)
  if (stakeholders) {
    for (const s of stakeholders) {
      if (s.invited_email && s.invited_email !== auth.email) {
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
 * Get all blocks in a space for #mention autocomplete (portal view)
 */
export async function getPortalBlocksForMention(
  spaceId: string
): Promise<{ success: true; blocks: BlockForMention[] } | { success: false; error: string }> {
  const auth = await getAuthPortalClient(spaceId)
  if (!auth) {
    return { success: false, error: 'Not authorized' }
  }

  const adminSupabase = await createAdminClient()

  // Get all visible pages for this space
  const { data: pages, error: pagesError } = await adminSupabase
    .from('pages')
    .select('id, slug')
    .eq('space_id', spaceId)
    .eq('is_visible', true)
    .is('deleted_at', null)

  if (pagesError || !pages || pages.length === 0) {
    return { success: true, blocks: [] }
  }

  const pageIds = pages.map(p => p.id)
  const pageSlugMap = new Map(pages.map(p => [p.id, p.slug]))

  // Get all blocks from those pages
  const { data: blocks, error: blocksError } = await adminSupabase
    .from('blocks')
    .select('id, type, content, page_id')
    .in('page_id', pageIds)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })

  if (blocksError) {
    console.error('[getPortalBlocksForMention] Error:', blocksError)
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
