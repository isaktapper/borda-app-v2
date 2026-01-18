'use client'

import { useState, useEffect } from 'react'
import { User, Building, Palette, Tag, CreditCard } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter, useSearchParams } from 'next/navigation'

interface SettingsLayoutProps {
  sections: {
    profile: React.ReactNode
    organization: React.ReactNode
    branding: React.ReactNode
    tags: React.ReactNode
    billing?: React.ReactNode
  }
  defaultTab?: string
  showBilling?: boolean
}

const navigationItems = [
  {
    id: 'profile',
    label: 'Profile',
    icon: User,
  },
  {
    id: 'organization',
    label: 'Organization',
    icon: Building,
  },
  {
    id: 'branding',
    label: 'Branding',
    icon: Palette,
  },
  {
    id: 'tags',
    label: 'Tags',
    icon: Tag,
  },
  {
    id: 'billing',
    label: 'Billing',
    icon: CreditCard,
  }
]

export function SettingsLayout({ sections, defaultTab = 'profile', showBilling = true }: SettingsLayoutProps) {
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

  // Filter out billing if not shown
  const visibleItems = showBilling 
    ? navigationItems 
    : navigationItems.filter(item => item.id !== 'billing')

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b">
        <nav className="flex gap-1 -mb-px" aria-label="Settings tabs">
          {visibleItems.map((item) => {
            const Icon = item.icon
            const isActive = currentTab === item.id

            return (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
                )}
              >
                <Icon className="size-4" />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Content Area */}
      <div className="min-w-0">
        {currentTab === 'profile' && sections.profile}
        {currentTab === 'organization' && sections.organization}
        {currentTab === 'branding' && sections.branding}
        {currentTab === 'tags' && sections.tags}
        {currentTab === 'billing' && sections.billing}
      </div>
    </div>
  )
}
