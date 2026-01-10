'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Check, 
  ExternalLink,
  Loader2,
  ArrowRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PLANS, PlanType, BillingInterval } from '@/lib/stripe'
import { toast } from 'sonner'

interface Subscription {
  id: string
  organization_id: string
  stripe_customer_id: string
  stripe_subscription_id: string | null
  plan: 'trial' | 'growth' | 'scale' | null
  billing_interval: 'month' | 'year' | null
  status: 'trialing' | 'active' | 'canceled' | 'past_due' | 'unpaid' | 'incomplete'
  trial_ends_at: string | null
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
}

interface BillingSectionProps {
  organizationId: string
  organizationName: string
  subscription: Subscription | null
  trialDaysRemaining: number
  canManageBilling: boolean
  userRole: string
}

export function BillingSection({
  organizationId,
  subscription,
  trialDaysRemaining,
  canManageBilling,
  userRole,
}: BillingSectionProps) {
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('year')
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const currentPlan = subscription?.plan
  const isTrialing = subscription?.status === 'trialing'
  const isActive = subscription?.status === 'active'
  const hasActivePlan = isActive && currentPlan && currentPlan !== 'trial'
  const activePaidPlan = hasActivePlan ? currentPlan : null

  async function handleUpgrade(plan: PlanType) {
    if (!canManageBilling) {
      toast.error('Only the organization owner can manage billing')
      return
    }
    
    setLoading(plan)
    setError(null)
    
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
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }
      
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('No checkout URL received')
      }
    } catch (err: any) {
      console.error('Checkout error:', err)
      setError(err.message)
      toast.error(err.message || 'Failed to start checkout')
      setLoading(null)
    }
  }


  async function handleManageBilling() {
    if (!canManageBilling) {
      toast.error('Only the organization owner can manage billing')
      return
    }
    
    setLoading('portal')
    setError(null)
    
    try {
      const response = await fetch('/api/stripe/create-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to open billing portal')
      }
      
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('No portal URL received')
      }
    } catch (err: any) {
      console.error('Portal error:', err)
      setError(err.message)
      toast.error(err.message || 'Failed to open billing portal')
      setLoading(null)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Billing</h2>
        <p className="text-muted-foreground mt-1">
          Manage your subscription and billing.
        </p>
      </div>

      {/* Current Status */}
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-lg">
                {isTrialing ? 'Free Trial' : hasActivePlan ? `${currentPlan?.charAt(0).toUpperCase()}${currentPlan?.slice(1)} Plan` : 'No active plan'}
              </h3>
              {isTrialing && (
                <Badge variant="secondary">
                  {trialDaysRemaining} days left
                </Badge>
              )}
              {hasActivePlan && (
                <Badge variant="outline" className="capitalize">
                  {subscription?.billing_interval === 'year' ? 'Yearly' : 'Monthly'}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {isTrialing 
                ? 'Upgrade to unlock all features and continue after your trial ends.'
                : hasActivePlan && subscription?.current_period_end
                  ? `Renews on ${new Date(subscription.current_period_end).toLocaleDateString()}`
                  : 'Choose a plan to get started.'
              }
            </p>
          </div>
          
          {hasActivePlan && canManageBilling && (
            <Button 
              variant="outline" 
              onClick={handleManageBilling}
              disabled={loading === 'portal'}
            >
              {loading === 'portal' ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <ExternalLink className="w-4 h-4 mr-2" />
              )}
              Manage billing
            </Button>
          )}
        </div>
      </Card>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Billing Toggle */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Choose your plan</span>
        <div className="inline-flex items-center p-1 bg-muted rounded-lg">
          <button
            onClick={() => setBillingInterval('month')}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-md transition-colors',
              billingInterval === 'month'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingInterval('year')}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-md transition-colors',
              billingInterval === 'year'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Yearly <span className="text-primary font-semibold">-17%</span>
          </button>
        </div>
      </div>

      {/* Plan Cards - Always show both */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Growth Plan */}
        <Card className={cn(
          'p-6 relative',
          activePaidPlan === 'growth' && 'ring-2 ring-primary'
        )}>
          {activePaidPlan === 'growth' && (
            <Badge className="absolute -top-2.5 left-4">
              Current Plan
            </Badge>
          )}

          <div className="mb-4">
            <h3 className="text-xl font-semibold">{PLANS.growth.name}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {PLANS.growth.description}
            </p>
          </div>

          <div className="mb-6">
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold">
                ${billingInterval === 'month' ? '49' : '41'}
              </span>
              <span className="text-muted-foreground">/month</span>
            </div>
            {billingInterval === 'year' && (
              <p className="text-sm text-muted-foreground mt-1">
                $492/year · Save $96
              </p>
            )}
          </div>

          <ul className="space-y-3 mb-6">
            {PLANS.growth.features.map((feature, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          <Button
            onClick={() => handleUpgrade('growth')}
            disabled={activePaidPlan === 'growth' || loading !== null || !canManageBilling}
            variant={activePaidPlan === 'growth' ? 'outline' : 'secondary'}
            className="w-full"
          >
            {loading === 'growth' && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            {activePaidPlan === 'growth' ? 'Current plan' : 'Get Growth'}
          </Button>
        </Card>

        {/* Scale Plan */}
        <Card className={cn(
          'p-6 relative border-2 border-primary',
          activePaidPlan === 'scale' && 'ring-2 ring-primary'
        )}>
          <Badge className="absolute -top-2.5 left-4 bg-primary text-primary-foreground">
            {activePaidPlan === 'scale' ? 'Current Plan' : 'Recommended'}
          </Badge>

          <div className="mb-4">
            <h3 className="text-xl font-semibold">{PLANS.scale.name}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {PLANS.scale.description}
            </p>
          </div>

          <div className="mb-6">
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold">
                ${billingInterval === 'month' ? '99' : '82'}
              </span>
              <span className="text-muted-foreground">/month</span>
            </div>
            {billingInterval === 'year' && (
              <p className="text-sm text-muted-foreground mt-1">
                $984/year · Save $204
              </p>
            )}
          </div>

          <ul className="space-y-3 mb-6">
            {PLANS.scale.features.map((feature, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          <Button
            onClick={() => handleUpgrade('scale')}
            disabled={activePaidPlan === 'scale' || loading !== null || !canManageBilling}
            className="w-full"
          >
            {loading === 'scale' && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            {activePaidPlan === 'scale' ? 'Current plan' : (
              <>
                {activePaidPlan === 'growth' ? 'Upgrade to Scale' : 'Get Scale'}
                {activePaidPlan === 'growth' && <ArrowRight className="w-4 h-4 ml-2" />}
              </>
            )}
          </Button>
        </Card>
      </div>

      {/* Upgrade CTA for Growth users */}
      {activePaidPlan === 'growth' && (
        <Card className="p-5 bg-primary/5 border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold">Ready to scale?</h4>
              <p className="text-sm text-muted-foreground mt-0.5">
                Upgrade to Scale for unlimited spaces, team members, and priority support.
              </p>
            </div>
            <Button onClick={() => handleUpgrade('scale')} disabled={loading !== null}>
              {loading === 'scale' && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Upgrade now
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </Card>
      )}

      {/* Permission Notice */}
      {!canManageBilling && (
        <p className="text-sm text-muted-foreground text-center">
          Only the organization owner can manage billing. Your role: <span className="font-medium capitalize">{userRole}</span>
        </p>
      )}

      {/* Billing History Link */}
      {hasActivePlan && canManageBilling && (
        <div className="pt-6 border-t">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold">Billing history</h4>
              <p className="text-sm text-muted-foreground mt-0.5">
                View invoices and manage payment methods.
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={handleManageBilling}
              disabled={loading === 'portal'}
            >
              {loading === 'portal' ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <ExternalLink className="w-4 h-4 mr-2" />
              )}
              View history
            </Button>
          </div>
        </div>
      )}

    </div>
  )
}
