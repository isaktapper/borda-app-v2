'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Check, AlertCircle } from 'lucide-react'
import { SlackIcon } from './slack-icon'
import { SlackSettingsDialog } from './slack-settings-dialog'

interface SlackConnectionCardProps {
  organizationId: string
  integration: any | null
  canManage: boolean
}

export function SlackConnectionCard({
  organizationId,
  integration,
  canManage
}: SlackConnectionCardProps) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  const isConnected = integration && integration.enabled

  const handleConnect = () => {
    setIsConnecting(true)
    window.location.href = '/api/slack/oauth/authorize'
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-muted flex items-center justify-center">
                <SlackIcon className="size-6" />
              </div>
              <div>
                <CardTitle className="text-lg">Slack</CardTitle>
                <CardDescription className="mt-0.5">
                  Get real-time notifications in Slack when stakeholders complete tasks, submit forms, or upload files
                </CardDescription>
              </div>
            </div>
            {isConnected ? (
              <Badge variant="default" className="flex items-center gap-1 bg-green-500 shrink-0">
                <Check className="size-3" />
                Connected
              </Badge>
            ) : canManage ? (
              <Button
                onClick={handleConnect}
                disabled={isConnecting}
                className="gap-2 shrink-0"
                size="sm"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <SlackIcon className="size-4" />
                    Connect Slack
                  </>
                )}
              </Button>
            ) : null}
          </div>
        </CardHeader>

        {isConnected && (
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {integration.team_name}
                  </p>
                  {integration.notification_channel_name && (
                    <p className="text-xs text-muted-foreground">
                      Posting to #{integration.notification_channel_name}
                    </p>
                  )}
                </div>
                {canManage && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSettings(true)}
                  >
                    Configure
                  </Button>
                )}
              </div>

              {integration.error_count > 0 && (
                <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg">
                  <AlertCircle className="size-4 text-destructive mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-destructive">
                      Recent delivery issues
                    </p>
                    <p className="text-muted-foreground text-xs mt-0.5">
                      {integration.last_error_message || 'Failed to deliver some notifications'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {showSettings && integration && (
        <SlackSettingsDialog
          integration={integration}
          onClose={() => setShowSettings(false)}
        />
      )}
    </>
  )
}
