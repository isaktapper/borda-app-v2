'use client'

import { useCallback } from 'react'
import { NextStepProvider, NextStep } from 'nextstepjs'
import { tours } from './steps'
import { TourCard } from './tour-card'

const TOUR_COMPLETED_KEY_PREFIX = 'borda_tour_'

function markTourCompleted(tourName: string) {
  try {
    localStorage.setItem(`${TOUR_COMPLETED_KEY_PREFIX}${tourName}_completed`, 'true')
    window.dispatchEvent(new CustomEvent('tour-completed', { detail: { tourName } }))
  } catch {
    // localStorage unavailable
  }
}

export function isTourCompleted(tourName: string): boolean {
  try {
    return localStorage.getItem(`${TOUR_COMPLETED_KEY_PREFIX}${tourName}_completed`) === 'true'
  } catch {
    return false
  }
}

function TourInner({ children }: { children: React.ReactNode }) {
  const handleComplete = useCallback((tourName: string | null) => {
    if (tourName) markTourCompleted(tourName)
  }, [])

  const handleSkip = useCallback((_step: number, tourName: string | null) => {
    if (tourName) markTourCompleted(tourName)
  }, [])

  return (
    <NextStep
      steps={tours}
      cardComponent={TourCard}
      shadowRgb="0, 0, 0"
      shadowOpacity="0.5"
      onComplete={handleComplete}
      onSkip={handleSkip}
      scrollToTop={false}
    >
      {children}
    </NextStep>
  )
}

export function TourProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextStepProvider>
      <TourInner>{children}</TourInner>
    </NextStepProvider>
  )
}
