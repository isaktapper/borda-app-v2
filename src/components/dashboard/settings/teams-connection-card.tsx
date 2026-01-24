'use client'

import { useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { TeamsIcon } from './teams-icon'
import { TeamsSettingsSheet } from './teams-settings-sheet'
import { IntegrationCard } from './integration-card'

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

  const connectionInfo = isConnected
    ? integration.channel_name
      ? `Connected to ${integration.channel_name}`
      : 'Connected via webhook'
    : undefined

  return (
    <>
      <IntegrationCard
        logo={<TeamsIcon className="size-7" />}
        name="Microsoft Teams"
        description="Get real-time notifications in Teams when stakeholders complete tasks, submit forms, or upload files."
        isConnected={isConnected}
        connectionInfo={connectionInfo}
        onConnect={() => setShowSettings(true)}
        onConfigure={() => setShowSettings(true)}
        externalLink={isConnected ? undefined : "https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook"}
        canManage={canManage}
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

      <TeamsSettingsSheet
        organizationId={organizationId}
        integration={integration}
        open={showSettings}
        onOpenChange={setShowSettings}
      />
    </>
  )
}
