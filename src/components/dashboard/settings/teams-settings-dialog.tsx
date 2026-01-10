'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
import { Loader2, Trash2, Save, Check, AlertCircle } from 'lucide-react'

const EVENT_OPTIONS = [
  { id: 'task.completed', label: 'Task completions', description: 'When customers complete tasks' },
  { id: 'form.submitted', label: 'Form submissions', description: 'When customers submit forms' },
  { id: 'file.uploaded', label: 'File uploads', description: 'When customers upload files' },
  { id: 'portal.first_visit', label: 'Portal first visits', description: 'When customers open the portal for the first time' },
  { id: 'space.status_changed', label: 'Status changes', description: 'When space status is updated' }
]

interface TeamsSettingsDialogProps {
  organizationId: string
  integration: any | null
  onClose: () => void
}

export function TeamsSettingsDialog({ organizationId, integration, onClose }: TeamsSettingsDialogProps) {
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
      // Create new integration
      result = await createTeamsIntegration(organizationId, webhookUrl, channelName || undefined)
    } else {
      // Update existing integration
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
      onClose()
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
          <DialogTitle>
            {isNewIntegration ? 'Connect Microsoft Teams' : 'Teams Settings'}
          </DialogTitle>
          <DialogDescription>
            {isNewIntegration
              ? 'Enter your Teams incoming webhook URL to receive notifications'
              : 'Configure which events trigger Teams notifications'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Webhook URL Input */}
          <div className="space-y-2">
            <Label htmlFor="webhook-url">Webhook URL</Label>
            <Input
              id="webhook-url"
              type="url"
              placeholder="https://[tenant].webhook.office.com/..."
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Create an Incoming Webhook in your Teams channel and paste the URL here
            </p>

            {/* Test Connection Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleTest}
              disabled={isTesting || !webhookUrl}
              className="w-full"
            >
              {isTesting ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Testing...
                </>
              ) : testStatus === 'success' ? (
                <>
                  <Check className="size-4 mr-2 text-green-500" />
                  Test Successful!
                </>
              ) : (
                'Test Connection'
              )}
            </Button>

            {testStatus === 'error' && testError && (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertDescription className="text-xs">{testError}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Channel Name Input (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="channel-name">Channel Name (optional)</Label>
            <Input
              id="channel-name"
              type="text"
              placeholder="e.g. Marketing Team"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              A friendly name to identify this channel
            </p>
          </div>

          {/* Event Selection */}
          <div className="space-y-3">
            <Label>Notify when:</Label>
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
          {!isNewIntegration ? (
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
          ) : (
            <div />
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !webhookUrl || enabledEvents.length === 0}
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
