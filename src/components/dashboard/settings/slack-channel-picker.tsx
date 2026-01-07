'use client'

import { useState, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getSlackChannels } from '@/app/(app)/settings/slack-actions'
import { Loader2 } from 'lucide-react'

interface SlackChannelPickerProps {
  integrationId: string
  selectedChannelId: string
  selectedChannelName: string
  onSelect: (id: string, name: string) => void
}

export function SlackChannelPicker({
  integrationId,
  selectedChannelId,
  selectedChannelName,
  onSelect
}: SlackChannelPickerProps) {
  const [channels, setChannels] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadChannels()
  }, [integrationId])

  const loadChannels = async () => {
    setIsLoading(true)
    const result = await getSlackChannels(integrationId)
    setIsLoading(false)

    if (result.channels) {
      setChannels(result.channels)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading channels...
      </div>
    )
  }

  return (
    <Select
      value={selectedChannelId}
      onValueChange={(value) => {
        const channel = channels.find(c => c.id === value)
        if (channel) {
          onSelect(channel.id, channel.name)
        }
      }}
    >
      <SelectTrigger>
        <SelectValue placeholder="Select a channel">
          {selectedChannelName ? `#${selectedChannelName}` : 'Select a channel'}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {channels.map(channel => (
          <SelectItem key={channel.id} value={channel.id}>
            #{channel.name}
            {channel.is_private && ' 🔒'}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
