'use server'

import { createClient } from '@/lib/supabase/server'

export interface Notification {
  id: string
  recipient_user_id: string | null
  recipient_email: string | null
  type: string
  space_id: string | null
  message_id: string | null
  read_at: string | null
  email_sent_at: string | null
  title: string
  body: string | null
  link: string | null
  created_at: string
}

/**
 * Get notifications for the current user
 */
export async function getNotifications(
  limit: number = 20,
  includeRead: boolean = false
): Promise<{ success: true; notifications: Notification[] } | { success: false; error: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  let query = supabase
    .from('notifications')
    .select('*')
    .eq('recipient_user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (!includeRead) {
    query = query.is('read_at', null)
  }

  const { data, error } = await query

  if (error) {
    console.error('[getNotifications] Error:', error)
    return { success: false, error: 'Could not load notifications' }
  }

  return { success: true, notifications: data as Notification[] }
}

/**
 * Get count of unread notifications
 */
export async function getUnreadCount(): Promise<{ success: true; count: number } | { success: false; error: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_user_id', user.id)
    .is('read_at', null)

  if (error) {
    console.error('[getUnreadCount] Error:', error)
    return { success: false, error: 'Could not count notifications' }
  }

  return { success: true, count: count || 0 }
}

/**
 * Mark a single notification as read
 */
export async function markAsRead(
  notificationId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('recipient_user_id', user.id) // Ensure user can only mark their own

  if (error) {
    console.error('[markAsRead] Error:', error)
    return { success: false, error: 'Could not mark as read' }
  }

  return { success: true }
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_user_id', user.id)
    .is('read_at', null)

  if (error) {
    console.error('[markAllAsRead] Error:', error)
    return { success: false, error: 'Could not mark all as read' }
  }

  return { success: true }
}

/**
 * Mark notifications for a specific space as read (e.g., when opening chat)
 */
export async function markSpaceNotificationsAsRead(
  spaceId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_user_id', user.id)
    .eq('space_id', spaceId)
    .is('read_at', null)

  if (error) {
    console.error('[markSpaceNotificationsAsRead] Error:', error)
    return { success: false, error: 'Could not mark as read' }
  }

  return { success: true }
}
