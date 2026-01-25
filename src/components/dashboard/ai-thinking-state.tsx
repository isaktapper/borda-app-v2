'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import Image from 'next/image'

// Dynamically import Lottie to avoid SSR issues
const Lottie = dynamic(() => import('lottie-react'), { ssr: false })

interface AIThinkingStateProps {
  onCancel?: () => void
}

const THINKING_STEPS = [
  { id: 1, text: 'Analyzing your content', duration: 5000 },
  { id: 2, text: 'Identifying phases and milestones', duration: 6000 },
  { id: 3, text: 'Structuring your implementation plan', duration: 7000 },
  { id: 4, text: 'Creating tasks and timelines', duration: 6000 },
  { id: 5, text: 'Finalizing your template', duration: 8000 },
]

export function AIThinkingState({ onCancel }: AIThinkingStateProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [lottieData, setLottieData] = useState<object | null>(null)
  const [useFallback, setUseFallback] = useState(false)

  // Progress through steps
  useEffect(() => {
    if (currentStep >= THINKING_STEPS.length) return

    const timer = setTimeout(() => {
      setCurrentStep(prev => Math.min(prev + 1, THINKING_STEPS.length - 1))
    }, THINKING_STEPS[currentStep].duration)

    return () => clearTimeout(timer)
  }, [currentStep])

  // Try to load custom Lottie animation
  useEffect(() => {
    fetch('/animations/logo-thinking.json')
      .then(res => {
        if (res.ok) return res.json()
        throw new Error('Not found')
      })
      .then(data => setLottieData(data))
      .catch(() => {
        setUseFallback(true)
      })
  }, [])

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-md text-center space-y-8">
        {/* Animated logo */}
        <div className="flex justify-center">
          {lottieData ? (
            <Lottie
              animationData={lottieData}
              loop
              className="w-24 h-24"
            />
          ) : useFallback ? (
            <div className="relative w-24 h-24">
              {/* Pulsing ring */}
              <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" />
              <div className="absolute inset-2 rounded-full border-2 border-primary/20 animate-pulse" />
              {/* Logo in center */}
              <div className="absolute inset-0 flex items-center justify-center">
                <Image
                  src="/borda_favicon_light.png"
                  alt="Borda"
                  width={48}
                  height={48}
                  className="animate-pulse dark:hidden"
                />
                <Image
                  src="/borda_favicon_dark.png"
                  alt="Borda"
                  width={48}
                  height={48}
                  className="animate-pulse hidden dark:block"
                />
              </div>
            </div>
          ) : (
            // Loading placeholder
            <div className="w-24 h-24 rounded-full bg-muted animate-pulse" />
          )}
        </div>

        {/* Title */}
        <div>
          <h2 className="text-xl font-semibold mb-2">Creating your template</h2>
          <p className="text-muted-foreground text-sm">
            This usually takes 15-30 seconds
          </p>
        </div>

        {/* Progress steps */}
        <div className="space-y-3 text-left">
          {THINKING_STEPS.map((step, index) => (
            <div
              key={step.id}
              className={`flex items-center gap-3 transition-opacity duration-300 ${
                index > currentStep ? 'opacity-30' : 'opacity-100'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                  index < currentStep
                    ? 'bg-primary text-primary-foreground'
                    : index === currentStep
                    ? 'bg-primary/20 text-primary border-2 border-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {index < currentStep ? (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={`text-sm ${
                  index === currentStep ? 'text-foreground font-medium' : 'text-muted-foreground'
                }`}
              >
                {step.text}
                {index === currentStep && (
                  <span className="inline-flex ml-1">
                    <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
                    <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
                    <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>

        {/* Cancel button */}
        {onCancel && (
          <Button
            variant="ghost"
            onClick={onCancel}
            className="text-muted-foreground hover:text-foreground"
          >
            Cancel
          </Button>
        )}
      </div>
    </div>
  )
}
