'use client'

import { useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { updateSlackSettings, disconnectSlack } from '@/app/(app)/settings/slack-actions'
import { SlackChannelPicker } from './slack-channel-picker'
import { SlackIcon } from './slack-icon'
import { Loader2, Trash2 } from 'lucide-react'

const EVENT_OPTIONS = [
  { id: 'task.completed', label: 'Task completions', description: 'When stakeholders complete tasks' },
  { id: 'form.submitted', label: 'Form submissions', description: 'When stakeholders submit forms' },
  { id: 'file.uploaded', label: 'File uploads', description: 'When stakeholders upload files' },
  { id: 'portal.first_visit', label: 'Portal first visits', description: 'When stakeholders open the portal for the first time' },
  { id: 'space.status_changed', label: 'Status changes', description: 'When space status is updated' }
]

interface SlackSettingsSheetProps {
  integration: any
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SlackSettingsSheet({ integration, open, onOpenChange }: SlackSettingsSheetProps) {
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
      onOpenChange(false)
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
      onOpenChange(false)
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader className="border-b pb-3 px-6">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-muted/50 flex items-center justify-center">
              <SlackIcon className="size-5" />
            </div>
            <div>
              <SheetTitle className="text-sm">Slack Settings</SheetTitle>
              <SheetDescription className="text-xs">
                Configure your Slack notifications
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-5 py-5 px-6">
          {/* Channel Selection */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Notification Channel</Label>
            <SlackChannelPicker
              integrationId={integration.id}
              selectedChannelId={channelId}
              selectedChannelName={channelName}
              onSelect={(id, name) => {
                setChannelId(id)
                setChannelName(name)
              }}
            />
            <p className="text-[11px] text-muted-foreground">
              Select which channel receives notifications
            </p>
          </div>

          {/* Event Selection */}
          <div className="space-y-3">
            <Label className="text-xs font-medium">Notify when:</Label>
            <div className="space-y-2.5">
              {EVENT_OPTIONS.map(event => (
                <div key={event.id} className="flex items-start gap-2.5">
                  <Checkbox
                    id={event.id}
                    checked={enabledEvents.includes(event.id)}
                    onCheckedChange={() => toggleEvent(event.id)}
                    className="mt-0.5 size-3.5"
                  />
                  <div className="flex-1 space-y-0">
                    <label
                      htmlFor={event.id}
                      className="text-xs font-medium cursor-pointer leading-none"
                    >
                      {event.label}
                    </label>
                    <p className="text-[11px] text-muted-foreground leading-tight">
                      {event.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="py-2">
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <SheetFooter className="border-t pt-3 px-6 pb-4">
          <div className="flex w-full items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDisconnect}
              disabled={isDisconnecting || isSaving}
              className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 text-xs"
            >
              {isDisconnecting ? (
                <>
                  <Loader2 className="size-3 animate-spin mr-1.5" />
                  Disconnecting...
                </>
              ) : (
                <>
                  <Trash2 className="size-3 mr-1.5" />
                  Disconnect
                </>
              )}
            </Button>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="h-8 text-xs">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving || !channelId || enabledEvents.length === 0}
                className="h-8 text-xs"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="size-3 animate-spin mr-1.5" />
                    Saving...
                  </>
                ) : (
                  'Save'
                )}
              </Button>
            </div>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
