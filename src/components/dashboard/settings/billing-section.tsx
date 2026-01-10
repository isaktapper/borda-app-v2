'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Check, 
  Clock,
  ExternalLink,
  Loader2,
  Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PLANS, PlanType, BillingInterval } from '@/lib/stripe'

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
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('month')
  const [loading, setLoading] = useState<string | null>(null)

  const currentPlan = subscription?.plan
  const isTrialing = subscription?.status === 'trialing'
  const isActive = subscription?.status === 'active'
  // Only consider it an "active paid plan" if status is active AND plan is not trial
  const hasActivePlan = isActive && currentPlan && currentPlan !== 'trial'
  // For button logic: only show "Current plan" if actively paying for that plan (not during trial)
  const activePaidPlan = hasActivePlan ? currentPlan : null

  // Format trial end date
  const trialEndDate = subscription?.trial_ends_at 
    ? new Date(subscription.trial_ends_at).toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      })
    : null

  async function handleUpgrade(plan: PlanType) {
    if (!canManageBilling) return
    
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

  async function handleManageBilling() {
    if (!canManageBilling) return
    
    setLoading('portal')
    try {
      const response = await fetch('/api/stripe/create-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId }),
      })

      const data = await response.json()
      
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error('Portal error:', error)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Billing settings</h2>
        <p className="text-muted-foreground mt-1">
          Manage your plan and billing history here.
        </p>
      </div>

      {/* Trial Status Card */}
      {isTrialing && (
        <Card className="p-5 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/50">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900 dark:text-amber-100">
                Free Trial
              </h3>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-0.5">
                {trialDaysRemaining > 0 ? (
                  <>
                    Your trial ends in <span className="font-semibold">{trialDaysRemaining} days</span>
                    {trialEndDate && <> on {trialEndDate}</>}
                  </>
                ) : (
                  'Your trial has expired. Please upgrade to continue.'
                )}
              </p>
            </div>
            <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
              Trial
            </Badge>
          </div>
        </Card>
      )}

      {/* Active Plan Card */}
      {hasActivePlan && (
        <Card className="p-5 bg-primary/5 border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-full bg-primary/10">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold capitalize">{currentPlan} Plan</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Billed {subscription?.billing_interval === 'year' ? 'yearly' : 'monthly'}
                  {subscription?.current_period_end && (
                    <> · Renews {new Date(subscription.current_period_end).toLocaleDateString()}</>
                  )}
                </p>
              </div>
            </div>
            {canManageBilling && (
              <Button 
                variant="outline" 
                size="sm"
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
      )}

      {/* Plan Selection - only show if not on active paid plan */}
      {!hasActivePlan && (
        <>
          {/* Billing Toggle */}
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">Billing period</span>
            <div className="inline-flex items-center gap-1 p-1 bg-muted rounded-lg">
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
                  'px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2',
                  billingInterval === 'year'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Yearly
                <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-semibold">
                  Save 17%
                </span>
              </button>
            </div>
          </div>

          {/* Plan Cards */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Growth Plan */}
            <Card className={cn(
              'p-6 relative transition-all',
              activePaidPlan === 'growth' && 'ring-2 ring-primary'
            )}>
              <div className="mb-4">
                <h3 className="text-lg font-semibold">{PLANS.growth.name} plan</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {PLANS.growth.description}
                </p>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold">
                  ${billingInterval === 'month' ? '49' : '41'}
                </span>
                <span className="text-muted-foreground ml-1">per month</span>
                {billingInterval === 'year' && (
                  <p className="text-sm text-muted-foreground mt-1">
                    $492 billed annually
                  </p>
                )}
              </div>

              <ul className="space-y-2.5 mb-6">
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
                variant={activePaidPlan === 'growth' ? 'outline' : 'default'}
                className="w-full"
              >
                {loading === 'growth' && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {activePaidPlan === 'growth' ? 'Current plan' : 'Upgrade to Growth'}
              </Button>
            </Card>

            {/* Scale Plan */}
            <Card className={cn(
              'p-6 relative transition-all border-primary',
              activePaidPlan === 'scale' ? 'ring-2 ring-primary' : 'border-2'
            )}>
              <Badge className="absolute -top-2.5 right-4 bg-primary text-primary-foreground">
                Most Popular
              </Badge>

              <div className="mb-4">
                <h3 className="text-lg font-semibold">{PLANS.scale.name} plan</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {PLANS.scale.description}
                </p>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold">
                  ${billingInterval === 'month' ? '99' : '82'}
                </span>
                <span className="text-muted-foreground ml-1">per month</span>
                {billingInterval === 'year' && (
                  <p className="text-sm text-muted-foreground mt-1">
                    $984 billed annually
                  </p>
                )}
              </div>

              <ul className="space-y-2.5 mb-6">
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
                variant={activePaidPlan === 'scale' ? 'outline' : 'default'}
                className="w-full"
              >
                {loading === 'scale' && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {activePaidPlan === 'scale' ? 'Current plan' : 'Upgrade to Scale'}
              </Button>
            </Card>
          </div>
        </>
      )}

      {/* Permission Notice */}
      {!canManageBilling && (
        <Card className="p-4 bg-muted/50">
          <p className="text-sm text-muted-foreground text-center">
            Only the organization owner can manage billing. 
            Your role: <span className="font-medium capitalize">{userRole}</span>
          </p>
        </Card>
      )}

      {/* Billing History Link - for active subscribers */}
      {hasActivePlan && canManageBilling && (
        <div className="pt-4 border-t">
          <h3 className="font-semibold mb-3">Billing history</h3>
          <p className="text-sm text-muted-foreground mb-4">
            View and download your past invoices from the Stripe billing portal.
          </p>
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
            View billing history
          </Button>
        </div>
      )}
    </div>
  )
}
