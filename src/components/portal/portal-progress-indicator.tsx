'use client'

import { cn } from '@/lib/utils'
import { CheckCircle2, Sparkles } from 'lucide-react'

interface PortalProgressIndicatorProps {
  percentage: number
  completedItems: number
  totalItems: number
}

export function PortalProgressIndicator({ 
  percentage, 
  completedItems, 
  totalItems 
}: PortalProgressIndicatorProps) {
  const isComplete = percentage === 100

  // Calculate circle progress
  const radius = 16
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <div className="flex items-center gap-2">
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
      <div className="hidden sm:block">
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
    </div>
  )
}

