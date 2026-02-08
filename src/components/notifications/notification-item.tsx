'use client'

import { formatDistanceToNow } from 'date-fns'
import { MessageCircle, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Notification {
  id: string
  type: string
  space_id: string | null
  title: string
  body: string | null
  link: string | null
  read_at: string | null
  created_at: string
}

interface NotificationItemProps {
  notification: Notification
  onRead: (id: string) => void
  onClick?: () => void
}

export function NotificationItem({ notification, onRead, onClick }: NotificationItemProps) {
  const isUnread = !notification.read_at
  const timeAgo = formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })

  const getIcon = () => {
    switch (notification.type) {
      case 'chat_message':
        return <MessageCircle className="size-4" />
      default:
        return <Bell className="size-4" />
    }
  }

  const handleClick = () => {
    if (isUnread) {
      onRead(notification.id)
    }
    onClick?.()
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        'w-full px-4 py-3 text-left flex items-start gap-3 hover:bg-muted transition-colors border-b last:border-b-0',
        isUnread && 'bg-primary/5'
      )}
    >
      <div
        className={cn(
          'size-8 rounded-full flex items-center justify-center shrink-0',
          notification.type === 'chat_message'
            ? 'bg-blue-100 text-blue-600'
            : 'bg-gray-100 text-gray-600'
        )}
      >
        {getIcon()}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={cn('text-sm truncate', isUnread && 'font-semibold')}>
            {notification.title}
          </p>
          {isUnread && (
            <span className="size-2 rounded-full bg-primary shrink-0" />
          )}
        </div>
        {notification.body && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
            {notification.body}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>
      </div>
    </button>
  )
}
