'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AlertCircle, Mail, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PLANS, BillingInterval, AllPrices } from '@/lib/stripe'

interface TrialExpiredBlockerProps {
  organizationId: string
  prices: AllPrices
}

export function TrialExpiredBlocker({ organizationId, prices }: TrialExpiredBlockerProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('month')

  // Calculate dynamic prices
  const growthMonthly = Math.round(prices.growth.month.amount / 100)
  const growthYearlyPerMonth = Math.round(prices.growth.year.amount / 100 / 12)

  const scaleMonthly = Math.round(prices.scale.month.amount / 100)
  const scaleYearlyPerMonth = Math.round(prices.scale.year.amount / 100 / 12)

  // Calculate average discount percentage
  const growthYearlyTotal = Math.round(prices.growth.year.amount / 100)
  const scaleYearlyTotal = Math.round(prices.scale.year.amount / 100)
  const growthYearlySavings = (growthMonthly * 12) - growthYearlyTotal
  const scaleYearlySavings = (scaleMonthly * 12) - scaleYearlyTotal
  const avgDiscountPercent = Math.round(
    ((growthYearlySavings / (growthMonthly * 12) + scaleYearlySavings / (scaleMonthly * 12)) / 2) * 100
  )

  async function handleUpgrade(plan: 'growth' | 'scale') {
    setLoading(plan)
    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          interval: billingInterval,
          organizationId,
        }),
      })

      const data = await response.json()
      
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error('Checkout error:', error)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-card border rounded-2xl shadow-2xl p-8 text-center">
        {/* Icon */}
        <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-6">
          <AlertCircle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold tracking-tight mb-2">
          Oops, your trial has expired
        </h1>

        {/* Description */}
        <p className="text-muted-foreground mb-8">
          Please upgrade your plan to continue using Borda and managing your stakeholder portals.
        </p>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-1 p-1 bg-muted rounded-lg text-sm">
            <button
              onClick={() => setBillingInterval('month')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                billingInterval === 'month'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingInterval('year')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                billingInterval === 'year'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Yearly
              <span className="ml-1.5 text-xs text-primary font-semibold">-{avgDiscountPercent}%</span>
            </button>
          </div>
        </div>

        {/* Plan Options */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {/* Growth Plan */}
          <button
            onClick={() => handleUpgrade('growth')}
            disabled={loading !== null}
            className="p-4 border rounded-xl text-left hover:border-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
          >
            <div className="font-semibold mb-1">{PLANS.growth.name}</div>
            <div className="text-2xl font-bold">
              ${billingInterval === 'month' ? growthMonthly : growthYearlyPerMonth}
              <span className="text-sm font-normal text-muted-foreground">/mo</span>
            </div>
            {loading === 'growth' && (
              <Loader2 className="w-4 h-4 animate-spin mt-2" />
            )}
          </button>

          {/* Scale Plan */}
          <button
            onClick={() => handleUpgrade('scale')}
            disabled={loading !== null}
            className="p-4 border-2 border-primary rounded-xl text-left bg-primary/5 hover:bg-primary/10 transition-colors disabled:opacity-50 relative"
          >
            <span className="absolute -top-2 right-3 text-[10px] font-semibold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
              Popular
            </span>
            <div className="font-semibold mb-1">{PLANS.scale.name}</div>
            <div className="text-2xl font-bold">
              ${billingInterval === 'month' ? scaleMonthly : scaleYearlyPerMonth}
              <span className="text-sm font-normal text-muted-foreground">/mo</span>
            </div>
            {loading === 'scale' && (
              <Loader2 className="w-4 h-4 animate-spin mt-2" />
            )}
          </button>
        </div>

        {/* Support Link */}
        <div className="pt-6 border-t">
          <p className="text-sm text-muted-foreground">
            Need help? Contact support at{' '}
            <a 
              href="mailto:support@borda.work" 
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              <Mail className="w-3 h-3" />
              support@borda.work
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
