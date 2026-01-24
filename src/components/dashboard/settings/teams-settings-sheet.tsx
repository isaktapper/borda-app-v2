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
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  testTeamsWebhook,
  createTeamsIntegration,
  updateTeamsSettings,
  disconnectTeams
} from '@/app/(app)/settings/teams-actions'
import { TeamsIcon } from './teams-icon'
import { Loader2, Trash2, Check, AlertCircle } from 'lucide-react'

const EVENT_OPTIONS = [
  { id: 'task.completed', label: 'Task completions', description: 'When stakeholders complete tasks' },
  { id: 'form.submitted', label: 'Form submissions', description: 'When stakeholders submit forms' },
  { id: 'file.uploaded', label: 'File uploads', description: 'When stakeholders upload files' },
  { id: 'portal.first_visit', label: 'Portal first visits', description: 'When stakeholders open the portal for the first time' },
  { id: 'space.status_changed', label: 'Status changes', description: 'When space status is updated' }
]

interface TeamsSettingsSheetProps {
  organizationId: string
  integration: any | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TeamsSettingsSheet({ organizationId, integration, open, onOpenChange }: TeamsSettingsSheetProps) {
  const isNewIntegration = !integration

  const [webhookUrl, setWebhookUrl] = useState(integration?.webhook_url || '')
  const [channelName, setChannelName] = useState(integration?.channel_name || '')
  const [enabledEvents, setEnabledEvents] = useState<string[]>(
    integration?.enabled_events || ['task.completed', 'form.submitted', 'file.uploaded', 'portal.first_visit', 'space.status_changed']
  )

  const [isTesting, setIsTesting] = useState(false)
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [testError, setTestError] = useState<string | null>(null)

  const [isSaving, setIsSaving] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleTest = async () => {
    if (!webhookUrl) {
      setTestError('Please enter a webhook URL first')
      setTestStatus('error')
      return
    }

    setIsTesting(true)
    setTestError(null)
    setTestStatus('idle')

    const result = await testTeamsWebhook(webhookUrl)

    setIsTesting(false)

    if (result.success) {
      setTestStatus('success')
      setTimeout(() => setTestStatus('idle'), 3000)
    } else {
      setTestStatus('error')
      setTestError(result.error || 'Test failed')
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)

    let result

    if (isNewIntegration) {
      result = await createTeamsIntegration(organizationId, webhookUrl, channelName || undefined)
    } else {
      result = await updateTeamsSettings(integration.id, {
        webhookUrl,
        channelName: channelName || undefined,
        enabledEvents
      })
    }

    setIsSaving(false)

    if (result.error) {
      setError(result.error)
    } else {
      onOpenChange(false)
      window.location.reload()
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Microsoft Teams? You\'ll stop receiving notifications.')) {
      return
    }

    setIsDisconnecting(true)
    const result = await disconnectTeams(integration.id)
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
              <TeamsIcon className="size-5" />
            </div>
            <div>
              <SheetTitle className="text-sm">
                {isNewIntegration ? 'Connect Microsoft Teams' : 'Teams Settings'}
              </SheetTitle>
              <SheetDescription className="text-xs">
                {isNewIntegration
                  ? 'Enter your webhook URL to receive notifications'
                  : 'Configure your Teams notifications'}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-5 py-5 px-6">
          {/* Webhook URL Input */}
          <div className="space-y-1.5">
            <Label htmlFor="webhook-url" className="text-xs font-medium">Webhook URL</Label>
            <Input
              id="webhook-url"
              type="url"
              placeholder="https://[tenant].webhook.office.com/..."
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="font-mono text-xs h-8"
            />
            <p className="text-[11px] text-muted-foreground">
              Create an Incoming Webhook in your Teams channel and paste the URL here
            </p>

            {/* Test Connection Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleTest}
              disabled={isTesting || !webhookUrl}
              className="w-full h-8 text-xs"
            >
              {isTesting ? (
                <>
                  <Loader2 className="size-3 animate-spin mr-1.5" />
                  Testing...
                </>
              ) : testStatus === 'success' ? (
                <>
                  <Check className="size-3 mr-1.5 text-green-500" />
                  Test Successful!
                </>
              ) : (
                'Test Connection'
              )}
            </Button>

            {testStatus === 'error' && testError && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="size-3" />
                <AlertDescription className="text-[11px]">{testError}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Channel Name Input (Optional) */}
          <div className="space-y-1.5">
            <Label htmlFor="channel-name" className="text-xs font-medium">Channel Name (optional)</Label>
            <Input
              id="channel-name"
              type="text"
              placeholder="e.g. Marketing Team"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              className="text-xs h-8"
            />
            <p className="text-[11px] text-muted-foreground">
              A friendly name to identify this channel
            </p>
          </div>

          {/* Event Selection */}
          <div className="space-y-3">
            <Label className="text-xs font-medium">Notify when:</Label>
            <div className="space-y-2.5">
              {EVENT_OPTIONS.map(event => (
                <div key={event.id} className="flex items-start gap-2.5">
                  <Checkbox
                    id={`teams-${event.id}`}
                    checked={enabledEvents.includes(event.id)}
                    onCheckedChange={() => toggleEvent(event.id)}
                    className="mt-0.5 size-3.5"
                  />
                  <div className="flex-1 space-y-0">
                    <label
                      htmlFor={`teams-${event.id}`}
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
            {!isNewIntegration ? (
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
            ) : (
              <div />
            )}

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="h-8 text-xs">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving || !webhookUrl || enabledEvents.length === 0}
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
