'use client'

import { useState, useEffect } from 'react'
import { User, Users, Building, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter, useSearchParams } from 'next/navigation'

interface SettingsLayoutProps {
  sections: {
    profile: React.ReactNode
    team: React.ReactNode
    organization: React.ReactNode
    tags: React.ReactNode
  }
  defaultTab?: string
}

const navigationItems = [
  {
    id: 'profile',
    label: 'Profile',
    icon: User,
    description: 'Manage your personal profile',
    disabled: false
  },
  {
    id: 'team',
    label: 'Team',
    icon: Users,
    description: 'Manage organization members',
    disabled: false
  },
  {
    id: 'organization',
    label: 'Organization',
    icon: Building,
    description: 'Organization settings',
    disabled: false
  },
  {
    id: 'tags',
    label: 'Tags',
    icon: Tag,
    description: 'Tag management',
    disabled: false
  }
]

export function SettingsLayout({ sections, defaultTab = 'profile' }: SettingsLayoutProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [currentTab, setCurrentTab] = useState(searchParams.get('tab') || defaultTab)

  useEffect(() => {
    const tab = searchParams.get('tab') || defaultTab
    setCurrentTab(tab)
  }, [searchParams, defaultTab])

  const handleTabChange = (tabId: string) => {
    setCurrentTab(tabId)
    router.push(`/settings?tab=${tabId}`, { scroll: false })
  }

  return (
    <div className="flex h-full gap-8">
      {/* Sidebar */}
      <div className="w-64 flex-shrink-0 space-y-1">
        {navigationItems.map((item) => {
          const Icon = item.icon
          const isActive = currentTab === item.id

          return (
            <button
              key={item.id}
              onClick={() => !item.disabled && handleTabChange(item.id)}
              disabled={item.disabled}
              className={cn(
                'w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                item.disabled
                  ? 'cursor-not-allowed opacity-60'
                  : 'hover:bg-muted/30',
                isActive
                  ? 'bg-muted/40 text-foreground border-l-2 border-primary'
                  : 'text-muted-foreground'
              )}
            >
              <div className="flex items-center gap-3">
                <Icon className="size-4 flex-shrink-0" />
                <span>{item.label}</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Content Area */}
      <div className="flex-1 min-w-0">
        {currentTab === 'profile' && sections.profile}
        {currentTab === 'team' && sections.team}
        {currentTab === 'organization' && sections.organization}
        {currentTab === 'tags' && sections.tags}
      </div>
    </div>
  )
}
