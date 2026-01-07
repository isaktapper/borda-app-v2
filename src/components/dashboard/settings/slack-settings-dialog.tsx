'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { updateSlackSettings, disconnectSlack } from '@/app/(app)/settings/slack-actions'
import { SlackChannelPicker } from './slack-channel-picker'
import { Loader2, Trash2, Save } from 'lucide-react'

const EVENT_OPTIONS = [
  { id: 'task.completed', label: 'Task completions', description: 'When customers complete tasks' },
  { id: 'form.submitted', label: 'Form submissions', description: 'When customers submit forms' },
  { id: 'file.uploaded', label: 'File uploads', description: 'When customers upload files' }
]

interface SlackSettingsDialogProps {
  integration: any
  onClose: () => void
}

export function SlackSettingsDialog({ integration, onClose }: SlackSettingsDialogProps) {
  const [enabledEvents, setEnabledEvents] = useState<string[]>(integration.enabled_events || [])
  const [channelId, setChannelId] = useState(integration.notification_channel_id || '')
  const [channelName, setChannelName] = useState(integration.notification_channel_name || '')
  const [isSaving, setIsSaving] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)

    const result = await updateSlackSettings(integration.id, {
      enabled_events: enabledEvents,
      notification_channel_id: channelId,
      notification_channel_name: channelName
    })

    setIsSaving(false)

    if (result.error) {
      setError(result.error)
    } else {
      onClose()
      window.location.reload()
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Slack? You\'ll stop receiving notifications.')) {
      return
    }

    setIsDisconnecting(true)
    const result = await disconnectSlack(integration.id)
    setIsDisconnecting(false)

    if (result.error) {
      setError(result.error)
    } else {
      onClose()
      window.location.reload()
    }
  }

  const toggleEvent = (eventId: string) => {
    setEnabledEvents(prev =>
      prev.includes(eventId)
        ? prev.filter(e => e !== eventId)
        : [...prev, eventId]
    )
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Slack Settings</DialogTitle>
          <DialogDescription>
            Configure which events trigger Slack notifications and where they're sent
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Channel Selection */}
          <div className="space-y-2">
            <Label>Notification Channel</Label>
            <SlackChannelPicker
              integrationId={integration.id}
              selectedChannelId={channelId}
              selectedChannelName={channelName}
              onSelect={(id, name) => {
                setChannelId(id)
                setChannelName(name)
              }}
            />
            <p className="text-xs text-muted-foreground">
              Select which channel receives notifications
            </p>
          </div>

          {/* Event Selection */}
          <div className="space-y-3">
            <Label>Notify when customers:</Label>
            {EVENT_OPTIONS.map(event => (
              <div key={event.id} className="flex items-start gap-3">
                <Checkbox
                  id={event.id}
                  checked={enabledEvents.includes(event.id)}
                  onCheckedChange={() => toggleEvent(event.id)}
                />
                <div className="flex-1">
                  <label
                    htmlFor={event.id}
                    className="text-sm font-medium cursor-pointer"
                  >
                    {event.label}
                  </label>
                  <p className="text-xs text-muted-foreground">
                    {event.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDisconnect}
            disabled={isDisconnecting || isSaving}
          >
            {isDisconnecting ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" />
                Disconnecting...
              </>
            ) : (
              <>
                <Trash2 className="size-4 mr-2" />
                Disconnect
              </>
            )}
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !channelId || enabledEvents.length === 0}
            >
              {isSaving ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="size-4 mr-2" />
                  Save
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
