'use client'

import { cn } from '@/lib/utils'
import { CheckCircle2, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface PageProgress {
  pageId: string
  pageTitle: string
  pageSlug: string
  totalItems: number
  completedItems: number
  progressPercentage: number
}

interface PortalProgressIndicatorProps {
  percentage: number
  completedItems: number
  totalItems: number
  spaceId: string
  pageProgress?: PageProgress[]
}

export function PortalProgressIndicator({ 
  percentage, 
  completedItems, 
  totalItems,
  spaceId,
  pageProgress = []
}: PortalProgressIndicatorProps) {
  const isComplete = percentage === 100

  // Calculate circle progress
  const radius = 16
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  // Filter to only show pages with actionable items
  const pagesWithItems = pageProgress.filter(p => p.totalItems > 0)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer">
          {/* Circular Progress */}
          <div className="relative size-10">
            <svg className="size-10 -rotate-90" viewBox="0 0 40 40">
              {/* Background circle */}
              <circle
                cx="20"
                cy="20"
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="text-muted/30"
              />
              {/* Progress circle */}
              <circle
                cx="20"
                cy="20"
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className={cn(
                  "transition-all duration-700 ease-out",
                  isComplete ? "text-emerald-500" : "text-primary"
                )}
              />
            </svg>
            {/* Center content */}
            <div className="absolute inset-0 flex items-center justify-center">
              {isComplete ? (
                <CheckCircle2 className="size-4 text-emerald-500" />
              ) : (
                <span className="text-xs font-bold">{percentage}%</span>
              )}
            </div>
          </div>

          {/* Text */}
          <div className="hidden sm:block text-left">
            <p className={cn(
              "text-xs font-medium leading-tight",
              isComplete ? "text-emerald-600" : "text-foreground"
            )}>
              {isComplete ? 'All done!' : `${completedItems} of ${totalItems}`}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {isComplete ? 'Great job!' : 'completed'}
            </p>
          </div>
        </button>
      </PopoverTrigger>

      <PopoverContent 
        className="w-72 p-0" 
        align="end"
        sideOffset={8}
      >
        <div className="p-3 border-b">
          <h3 className="font-semibold text-sm">Progress by page</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isComplete ? 'All tasks completed!' : `${completedItems} of ${totalItems} items done`}
          </p>
        </div>

        <div className="max-h-64 overflow-y-auto">
          {pagesWithItems.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No actionable items yet
            </div>
          ) : (
            <div className="py-1">
              {pagesWithItems.map((page) => {
                const pageComplete = page.progressPercentage === 100
                
                return (
                  <Link
                    key={page.pageId}
                    href={`/space/${spaceId}/shared/${page.pageSlug}`}
                    className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors group"
                  >
                    {/* Mini progress circle */}
                    <div className="relative size-8 shrink-0">
                      <svg className="size-8 -rotate-90" viewBox="0 0 32 32">
                        <circle
                          cx="16"
                          cy="16"
                          r="12"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          className="text-muted/30"
                        />
                        <circle
                          cx="16"
                          cy="16"
                          r="12"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeDasharray={2 * Math.PI * 12}
                          strokeDashoffset={(2 * Math.PI * 12) - (page.progressPercentage / 100) * (2 * Math.PI * 12)}
                          className={cn(
                            "transition-all duration-500",
                            pageComplete ? "text-emerald-500" : "text-primary"
                          )}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        {pageComplete ? (
                          <CheckCircle2 className="size-3 text-emerald-500" />
                        ) : (
                          <span className="text-[9px] font-bold">{page.progressPercentage}%</span>
                        )}
                      </div>
                    </div>

                    {/* Page info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{page.pageTitle}</p>
                      <p className="text-xs text-muted-foreground">
                        {page.completedItems} of {page.totalItems} items
                      </p>
                    </div>

                    {/* Arrow */}
                    <ChevronRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
