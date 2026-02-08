'use client'

import type { CardComponentProps } from 'nextstepjs'
import { Button } from '@/components/ui/button'

export function TourCard({
  step,
  currentStep,
  totalSteps,
  nextStep,
  prevStep,
  skipTour,
  arrow,
}: CardComponentProps) {
  const isFirst = currentStep === 0
  const isLast = currentStep === totalSteps - 1

  return (
    <div className="relative w-[340px] rounded-xl border bg-popover text-popover-foreground shadow-lg">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 pt-4 pb-2">
        {step.icon && (
          <span className="text-lg leading-none">{step.icon}</span>
        )}
        <h3 className="text-sm font-semibold leading-snug">{step.title}</h3>
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {step.content}
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t px-4 py-3">
        <span className="text-xs text-muted-foreground tabular-nums">
          {currentStep + 1} of {totalSteps}
        </span>

        <div className="flex items-center gap-2">
          {skipTour && (
            <Button variant="ghost" size="sm" onClick={skipTour} className="h-7 text-xs text-muted-foreground">
              Skip
            </Button>
          )}
          {!isFirst && (
            <Button variant="outline" size="sm" onClick={prevStep} className="h-7 text-xs">
              Back
            </Button>
          )}
          <Button size="sm" onClick={nextStep} className="h-7 text-xs">
            {isLast ? 'Done' : 'Next'}
          </Button>
        </div>
      </div>

      {arrow}
    </div>
  )
}
