'use client'

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ExternalLink, Settings } from 'lucide-react'

interface IntegrationCardProps {
  logo: ReactNode
  name: string
  description: string
  isConnected: boolean
  connectionInfo?: string
  onConnect?: () => void
  onConfigure?: () => void
  externalLink?: string
  canManage: boolean
  isConnecting?: boolean
  connectLabel?: string
  children?: ReactNode
}

export function IntegrationCard({
  logo,
  name,
  description,
  isConnected,
  connectionInfo,
  onConnect,
  onConfigure,
  externalLink,
  canManage,
  isConnecting,
  connectLabel = 'Connect',
  children
}: IntegrationCardProps) {
  return (
    <div className={cn(
      "relative rounded-xl border bg-card p-6 transition-all hover:shadow-md",
      isConnected && "ring-1 ring-green-500/20"
    )}>
      {/* External link icon in top right */}
      {externalLink && (
        <a
          href={externalLink}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ExternalLink className="size-4" />
        </a>
      )}

      {/* Connected badge */}
      {isConnected && (
        <div className="absolute top-4 right-4 flex items-center gap-1.5 text-green-600 text-xs font-medium">
          <div className="size-2 rounded-full bg-green-500" />
          Connected
        </div>
      )}

      <div className="space-y-4">
        {/* Logo and title */}
        <div className="flex items-start gap-4">
          <div className="size-12 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
            {logo}
          </div>
          <div className="space-y-1 min-w-0">
            <h3 className="font-semibold text-base">{name}</h3>
            {isConnected && connectionInfo ? (
              <p className="text-sm text-muted-foreground truncate">
                {connectionInfo}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          {isConnected ? (
            canManage && (
              <Button
                variant="outline"
                size="sm"
                onClick={onConfigure}
                className="gap-2"
              >
                <Settings className="size-4" />
                Settings
              </Button>
            )
          ) : canManage ? (
            <Button
              onClick={onConnect}
              disabled={isConnecting}
              size="sm"
              className="gap-2"
            >
              {isConnecting ? (
                'Connecting...'
              ) : (
                connectLabel
              )}
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">
              Contact an admin to connect this integration
            </p>
          )}
        </div>

        {/* Optional additional content (like error messages) */}
        {children}
      </div>
    </div>
  )
}
