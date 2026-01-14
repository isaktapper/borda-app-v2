'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'

// Dynamically import Lottie to avoid SSR issues
const Lottie = dynamic(() => import('lottie-react'), { ssr: false })

interface AIGeneratingStateProps {
  onCancel?: () => void
}

// Fallback animation when no Lottie file is available
function FallbackAnimation() {
  return (
    <div className="relative w-32 h-32 mx-auto">
      {/* Outer rotating ring */}
      <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-spin" style={{ animationDuration: '3s' }}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full" />
      </div>
      
      {/* Middle pulsing ring */}
      <div className="absolute inset-4 rounded-full border-2 border-primary/30 animate-pulse" />
      
      {/* Inner icon */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative">
          <Sparkles className="w-12 h-12 text-primary animate-pulse" />
          <div className="absolute inset-0 animate-ping">
            <Sparkles className="w-12 h-12 text-primary/30" />
          </div>
        </div>
      </div>
      
      {/* Floating dots */}
      <div className="absolute -top-2 left-1/4 w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
      <div className="absolute top-1/4 -right-2 w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
      <div className="absolute -bottom-2 right-1/4 w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
      <div className="absolute bottom-1/4 -left-2 w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '0.6s' }} />
    </div>
  )
}

const LOADING_MESSAGES = [
  'Analyzing your content...',
  'Identifying milestones and tasks...',
  'Structuring your implementation plan...',
  'Optimizing task sequences...',
  'Adding relative due dates...',
  'Finalizing your template...',
]

export function AIGeneratingState({ onCancel }: AIGeneratingStateProps) {
  const [messageIndex, setMessageIndex] = useState(0)
  const [lottieData, setLottieData] = useState<object | null>(null)

  // Rotate through messages
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % LOADING_MESSAGES.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  // Try to load Lottie animation
  useEffect(() => {
    fetch('/animations/ai-generating.json')
      .then(res => {
        if (res.ok) return res.json()
        throw new Error('Not found')
      })
      .then(data => setLottieData(data))
      .catch(() => {
        // Use fallback animation
        setLottieData(null)
      })
  }, [])

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] py-12">
      {/* Animation */}
      <div className="mb-8">
        {lottieData ? (
          <Lottie
            animationData={lottieData}
            loop
            className="w-48 h-48"
          />
        ) : (
          <FallbackAnimation />
        )}
      </div>

      {/* Loading text */}
      <div className="text-center space-y-2">
        <h3 className="text-xl font-semibold">Creating your template</h3>
        <p className="text-muted-foreground animate-pulse min-h-[1.5rem]">
          {LOADING_MESSAGES[messageIndex]}
        </p>
      </div>

      {/* Progress dots */}
      <div className="flex gap-1.5 mt-8">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-primary animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>

      {/* Cancel button */}
      {onCancel && (
        <Button
          variant="ghost"
          onClick={onCancel}
          className="mt-8 text-muted-foreground hover:text-foreground"
        >
          Cancel
        </Button>
      )}
    </div>
  )
}
