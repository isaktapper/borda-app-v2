'use client'

import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

interface CircularProgressProps {
    value: number // 0-100
    size?: number
    strokeWidth?: number
    className?: string
}

export function CircularProgress({
    value,
    size = 24,
    strokeWidth = 2.5,
    className
}: CircularProgressProps) {
    const radius = (size - strokeWidth) / 2
    const circumference = radius * 2 * Math.PI
    const offset = circumference - (value / 100) * circumference
    const isComplete = value >= 100

    if (isComplete) {
        // Completed state: solid green circle with white checkmark
        return (
            <div
                className={cn(
                    'flex items-center justify-center rounded-full bg-emerald-500',
                    className
                )}
                style={{ width: size, height: size }}
            >
                <Check
                    className="text-white"
                    style={{ width: size * 0.55, height: size * 0.55 }}
                    strokeWidth={3}
                />
            </div>
        )
    }

    // In progress state: outline circle with progress stroke
    return (
        <div className={cn('relative', className)} style={{ width: size, height: size }}>
            <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                className="transform -rotate-90"
            >
                {/* Background circle (track) */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    className="text-muted-foreground/20"
                />
                {/* Progress circle */}
                {value > 0 && (
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={strokeWidth}
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        className="text-primary transition-all duration-300"
                    />
                )}
            </svg>
        </div>
    )
}
