'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, AlertCircle } from 'lucide-react'
import { TeamsIcon } from './teams-icon'
import { TeamsSettingsDialog } from './teams-settings-dialog'

interface TeamsConnectionCardProps {
  organizationId: string
  integration: any | null
  canManage: boolean
}

export function TeamsConnectionCard({
  organizationId,
  integration,
  canManage
}: TeamsConnectionCardProps) {
  const [showSettings, setShowSettings] = useState(false)

  const isConnected = integration && integration.enabled

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-muted flex items-center justify-center">
                <TeamsIcon className="size-6 text-[#5558AF]" />
              </div>
              <div>
                <CardTitle className="text-lg">Microsoft Teams</CardTitle>
                <CardDescription className="mt-0.5">
                  Get real-time notifications in Teams when customers complete tasks, submit forms, or upload files
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
                onClick={() => setShowSettings(true)}
                className="gap-2 shrink-0"
                size="sm"
              >
                <TeamsIcon className="size-4" />
                Connect Microsoft Teams
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
                    {integration.channel_name || 'Teams Channel'}
                  </p>
                  {integration.webhook_url && (
                    <p className="text-xs text-muted-foreground font-mono truncate max-w-md">
                      {integration.webhook_url.substring(0, 50)}...
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

      {showSettings && (
        <TeamsSettingsDialog
          organizationId={organizationId}
          integration={integration}
          onClose={() => setShowSettings(false)}
        />
      )}
    </>
  )
}
