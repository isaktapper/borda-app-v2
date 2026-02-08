'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useNextStep } from 'nextstepjs'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Rocket, Check, ChevronRight, Compass, Layout, Users } from 'lucide-react'
import { isTourCompleted } from '@/lib/tour/tour-provider'
import { cn } from '@/lib/utils'

const DISMISSED_KEY = 'borda_checklist_dismissed'

interface ChecklistItem {
  id: string
  tourName: string
  label: string
  description: string
  icon: React.ElementType
  route: string
}

interface GettingStartedChecklistProps {
  demoSpaceId?: string | null
}

export function GettingStartedChecklist({ demoSpaceId }: GettingStartedChecklistProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { startNextStep } = useNextStep()
  const [open, setOpen] = useState(false)
  const [dismissed, setDismissed] = useState(true) // Start hidden to avoid flash
  const [completedTours, setCompletedTours] = useState<Record<string, boolean>>({})

  const items: ChecklistItem[] = [
    {
      id: 'explore-dashboard',
      tourName: 'explore-dashboard',
      label: 'Explore your dashboard',
      description: 'Learn about spaces, stats, and navigation',
      icon: Compass,
      route: '/spaces',
    },
    {
      id: 'explore-demo-space',
      tourName: 'explore-demo-space',
      label: 'Tour the space editor',
      description: 'See how pages, blocks, and preview work',
      icon: Layout,
      route: demoSpaceId ? `/spaces/${demoSpaceId}` : '',
    },
    {
      id: 'invite-stakeholders',
      tourName: 'invite-stakeholders',
      label: 'Invite stakeholders',
      description: 'Share your space and go live',
      icon: Users,
      route: demoSpaceId ? `/spaces/${demoSpaceId}` : '',
    },
  ]

  const refreshCompleted = useCallback(() => {
    const state: Record<string, boolean> = {}
    for (const item of items) {
      state[item.tourName] = isTourCompleted(item.tourName)
    }
    setCompletedTours(state)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoSpaceId])

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISSED_KEY) === 'true')
    refreshCompleted()

    const onTourCompleted = () => refreshCompleted()
    window.addEventListener('tour-completed', onTourCompleted)
    return () => window.removeEventListener('tour-completed', onTourCompleted)
  }, [refreshCompleted])

  const completedCount = Object.values(completedTours).filter(Boolean).length
  const allDone = completedCount === items.length

  if (dismissed || allDone) return null

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, 'true')
    setDismissed(true)
    setOpen(false)
  }

  const handleItemClick = (item: ChecklistItem) => {
    if (completedTours[item.tourName]) return
    if (!item.route) return

    setOpen(false)

    // If already on the correct page, start the tour immediately
    if (pathname === item.route || pathname?.startsWith(item.route + '/')) {
      setTimeout(() => startNextStep(item.tourName), 300)
    } else {
      // Navigate first, then start tour after page renders
      router.push(item.route)
      setTimeout(() => startNextStep(item.tourName), 1200)
    }
  }

  const progress = (completedCount / items.length) * 100

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 h-8 text-xs font-medium border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary"
        >
          <Rocket className="size-3.5" />
          Getting Started
          <span className="ml-0.5 tabular-nums text-[10px] text-primary/70">
            {completedCount}/{items.length}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        {/* Header */}
        <div className="p-4 pb-3">
          <h3 className="text-sm font-semibold">Getting Started</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Complete these steps to learn the basics
          </p>
          {/* Progress bar */}
          <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5 tabular-nums">
            {completedCount} of {items.length} completed
          </p>
        </div>

        {/* Items */}
        <div className="border-t">
          {items.map((item) => {
            const Icon = item.icon
            const isCompleted = completedTours[item.tourName]
            const isDisabled = !item.route && !isCompleted

            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item)}
                disabled={isDisabled}
                className={cn(
                  'flex items-center gap-3 w-full px-4 py-3 text-left transition-colors',
                  isCompleted
                    ? 'opacity-60'
                    : isDisabled
                      ? 'opacity-40 cursor-not-allowed'
                      : 'hover:bg-muted/50 cursor-pointer'
                )}
              >
                <div
                  className={cn(
                    'flex items-center justify-center size-8 rounded-lg shrink-0',
                    isCompleted
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {isCompleted ? (
                    <Check className="size-4" />
                  ) : (
                    <Icon className="size-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-medium', isCompleted && 'line-through')}>
                    {item.label}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {item.description}
                  </p>
                </div>
                {!isCompleted && !isDisabled && (
                  <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                )}
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <div className="border-t px-4 py-2.5">
          <button
            onClick={handleDismiss}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Dismiss forever
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
