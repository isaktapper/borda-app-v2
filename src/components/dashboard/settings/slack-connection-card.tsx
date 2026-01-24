'use client'

import { useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { SlackIcon } from './slack-icon'
import { SlackSettingsSheet } from './slack-settings-sheet'
import { IntegrationCard } from './integration-card'

interface SlackConnectionCardProps {
  organizationId: string
  integration: any | null
  canManage: boolean
}

export function SlackConnectionCard({
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

  const connectionInfo = isConnected
    ? integration.notification_channel_name
      ? `Connected to #${integration.notification_channel_name}`
      : `Connected to ${integration.team_name}`
    : undefined

  return (
    <>
      <IntegrationCard
        logo={<SlackIcon className="size-7" />}
        name="Slack"
        description="Get real-time notifications in Slack when stakeholders complete tasks, submit forms, or upload files."
        isConnected={isConnected}
        connectionInfo={connectionInfo}
        onConnect={handleConnect}
        onConfigure={() => setShowSettings(true)}
        externalLink={isConnected ? undefined : "https://slack.com/apps"}
        canManage={canManage}
        isConnecting={isConnecting}
        connectLabel="Connect"
      >
        {/* Error state */}
        {isConnected && integration.error_count > 0 && (
          <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg mt-4">
            <AlertCircle className="size-4 text-destructive mt-0.5 shrink-0" />
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
      </IntegrationCard>

      {showSettings && integration && (
        <SlackSettingsSheet
          integration={integration}
          open={showSettings}
          onOpenChange={setShowSettings}
        />
      )}
    </>
  )
}
