'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Loader2,
  Sparkles,
  ExternalLink,
  Download,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  Calendar,
  CreditCard,
  LayoutGrid,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PLANS, PlanType, BillingInterval, AllPrices } from '@/lib/stripe'
import { toast } from 'sonner'
import { trackUpgradeClicked } from '@/lib/posthog'

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

interface Invoice {
  id: string
  number: string | null
  date: number
  amount: number
  currency: string
  status: string | null
  description: string
  invoicePdf: string | null
  hostedInvoiceUrl: string | null
}

interface BillingSectionProps {
  organizationId: string
  organizationName: string
  subscription: Subscription | null
  trialDaysRemaining: number
  canManageBilling: boolean
  userRole: string
  prices: AllPrices
  usage: { activeSpaces: number; templates: number }
  limits: { maxActiveSpaces: number; maxTemplates: number }
}

export function BillingSection({
  organizationId,
  subscription,
  trialDaysRemaining,
  canManageBilling,
  userRole,
  prices,
  usage,
  limits,
}: BillingSectionProps) {
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('year')
  const [loading, setLoading] = useState<string | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [invoicesLoading, setInvoicesLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const currentPlan = subscription?.plan
  const isTrialing = subscription?.status === 'trialing'
  const isActive = subscription?.status === 'active'
  const hasActivePlan = isActive && currentPlan && currentPlan !== 'trial'
  const activePaidPlan = hasActivePlan ? currentPlan : null

  // Fetch invoices on mount
  useEffect(() => {
    async function fetchInvoices() {
      if (!organizationId) return
      setInvoicesLoading(true)
      try {
        const response = await fetch(`/api/stripe/invoices?organizationId=${organizationId}`)
        const data = await response.json()
        if (data.invoices) {
          setInvoices(data.invoices)
        }
      } catch (error) {
        console.error('Failed to fetch invoices:', error)
      } finally {
        setInvoicesLoading(false)
      }
    }
    fetchInvoices()
  }, [organizationId])

  // Calculate dynamic prices
  const currentPlanMonthly = activePaidPlan === 'scale'
    ? Math.round(prices.scale.month.amount / 100)
    : Math.round(prices.growth.month.amount / 100)
  const currentPlanYearly = activePaidPlan === 'scale'
    ? Math.round(prices.scale.year.amount / 100 / 12)
    : Math.round(prices.growth.year.amount / 100 / 12)

  const displayPrice = subscription?.billing_interval === 'year' ? currentPlanYearly : currentPlanMonthly

  async function handleUpgrade(plan: PlanType) {
    if (!canManageBilling) {
      toast.error('Only the organization owner can manage billing')
      return
    }

    trackUpgradeClicked({
      current_plan: (currentPlan || 'trial') as 'trial' | 'growth' | 'scale',
      target_plan: plan,
      source: 'billing_settings'
    })

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
      toast.error(err.message || 'Failed to open billing portal')
      setLoading(null)
    }
  }

  // Filter invoices by status
  const filteredInvoices = statusFilter === 'all'
    ? invoices
    : invoices.filter(inv => inv.status === statusFilter)

  // Calculate usage percentages
  const spacesPercent = limits.maxActiveSpaces === Infinity
    ? 0
    : Math.min(100, Math.round((usage.activeSpaces / limits.maxActiveSpaces) * 100))
  const templatesPercent = limits.maxTemplates === Infinity
    ? 0
    : Math.min(100, Math.round((usage.templates / limits.maxTemplates) * 100))

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Billing</h2>
        <p className="text-muted-foreground mt-1">
          Manage your subscription and billing.
        </p>
      </div>

      {/* Trial Banner */}
      {isTrialing && (
        <Card className="p-6 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200 dark:border-amber-800">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-100 dark:bg-amber-900/50 rounded-full">
                <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Free Trial</h3>
                <p className="text-muted-foreground mt-1">
                  {trialDaysRemaining > 0 ? (
                    <>You have <span className="font-semibold text-foreground">{trialDaysRemaining} days</span> left in your trial. Upgrade to keep access to all features.</>
                  ) : (
                    <>Your trial has expired. Upgrade to continue using Borda.</>
                  )}
                </p>
                <div className="flex items-center gap-3 mt-4">
                  <Button onClick={() => handleUpgrade('scale')} disabled={loading !== null}>
                    {loading === 'scale' && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    <Sparkles className="w-4 h-4 mr-2" />
                    Upgrade Now
                  </Button>
                  <Button variant="ghost" asChild>
                    <Link href="https://borda.work/pricing" target="_blank">
                      Compare Plans
                      <ArrowUpRight className="w-4 h-4 ml-1" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-4xl font-bold text-amber-600 dark:text-amber-400">
                {trialDaysRemaining}
              </div>
              <div className="text-sm text-muted-foreground">days left</div>
            </div>
          </div>
        </Card>
      )}

      {/* Subscription Overview */}
      <div>
        <h3 className="text-lg font-medium mb-4">Subscription Overview</h3>
        <div className="grid md:grid-cols-2 gap-4">
          {/* Current Plan */}
          <Card className="p-5">
            <div className="text-sm text-muted-foreground mb-3">Current Plan</div>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={isTrialing ? 'secondary' : 'default'} className="capitalize">
                    {isTrialing ? 'Trial' : activePaidPlan ? `${activePaidPlan} Plan` : 'No Plan'}
                  </Badge>
                  {subscription?.billing_interval && hasActivePlan && (
                    <span className="text-xs text-muted-foreground">
                      ({subscription.billing_interval === 'year' ? 'Yearly' : 'Monthly'})
                    </span>
                  )}
                </div>
                {hasActivePlan && (
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold">${displayPrice}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                )}
                {hasActivePlan && subscription?.current_period_end && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Renews {new Date(subscription.current_period_end).toLocaleDateString()}
                  </p>
                )}
              </div>
              {canManageBilling && (
                <div>
                  {hasActivePlan ? (
                    activePaidPlan === 'growth' ? (
                      <Button onClick={() => handleUpgrade('scale')} disabled={loading !== null}>
                        {loading === 'scale' && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                        <Sparkles className="w-4 h-4 mr-2" />
                        Upgrade
                      </Button>
                    ) : (
                      <Button variant="outline" onClick={handleManageBilling} disabled={loading === 'portal'}>
                        {loading === 'portal' && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                        Manage
                      </Button>
                    )
                  ) : !isTrialing && (
                    <Button onClick={() => handleUpgrade('growth')} disabled={loading !== null}>
                      {loading === 'growth' && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                      Choose Plan
                    </Button>
                  )}
                </div>
              )}
            </div>
          </Card>

          {/* Usage Summary */}
          <Card className="p-5">
            <div className="text-sm text-muted-foreground mb-3">Usage Summary</div>
            <div className="grid grid-cols-2 gap-6">
              {/* Active Spaces */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <LayoutGrid className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Active Spaces</span>
                </div>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-xl font-bold">{usage.activeSpaces}</span>
                  <span className="text-muted-foreground text-sm">
                    / {limits.maxActiveSpaces === Infinity ? 'Unlimited' : limits.maxActiveSpaces}
                  </span>
                </div>
                {limits.maxActiveSpaces !== Infinity && (
                  <Progress
                    value={spacesPercent}
                    className={cn(
                      "h-2",
                      spacesPercent >= 80 && "bg-amber-100 dark:bg-amber-950",
                      spacesPercent >= 100 && "bg-red-100 dark:bg-red-950"
                    )}
                  />
                )}
                {limits.maxActiveSpaces === Infinity && (
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full w-full bg-gradient-to-r from-primary/20 to-primary/40" />
                  </div>
                )}
              </div>

              {/* Templates */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Templates</span>
                </div>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-xl font-bold">{usage.templates}</span>
                  <span className="text-muted-foreground text-sm">
                    / {limits.maxTemplates === Infinity ? 'Unlimited' : limits.maxTemplates}
                  </span>
                </div>
                {limits.maxTemplates !== Infinity && (
                  <Progress
                    value={templatesPercent}
                    className={cn(
                      "h-2",
                      templatesPercent >= 80 && "bg-amber-100 dark:bg-amber-950",
                      templatesPercent >= 100 && "bg-red-100 dark:bg-red-950"
                    )}
                  />
                )}
                {limits.maxTemplates === Infinity && (
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full w-full bg-gradient-to-r from-primary/20 to-primary/40" />
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Plan Selection - Only show for trial or no plan */}
      {(isTrialing || (!hasActivePlan && !isTrialing)) && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">Choose Your Plan</h3>
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
                Yearly <span className="text-primary font-semibold">Save 18%</span>
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Growth Plan */}
            <Card className="p-5 relative">
              <div className="mb-4">
                <h4 className="font-semibold">{PLANS.growth.name}</h4>
                <p className="text-sm text-muted-foreground">{PLANS.growth.description}</p>
              </div>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-3xl font-bold">
                  ${billingInterval === 'month'
                    ? Math.round(prices.growth.month.amount / 100)
                    : Math.round(prices.growth.year.amount / 100 / 12)}
                </span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <ul className="space-y-2 mb-4 text-sm">
                {PLANS.growth.features.slice(0, 4).map((feature, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => handleUpgrade('growth')}
                disabled={loading !== null || !canManageBilling}
                variant="outline"
                className="w-full"
              >
                {loading === 'growth' && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Get Growth
              </Button>
            </Card>

            {/* Scale Plan */}
            <Card className="p-5 relative border-2 border-primary">
              <Badge className="absolute -top-2.5 left-4">Recommended</Badge>
              <div className="mb-4">
                <h4 className="font-semibold">{PLANS.scale.name}</h4>
                <p className="text-sm text-muted-foreground">{PLANS.scale.description}</p>
              </div>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-3xl font-bold">
                  ${billingInterval === 'month'
                    ? Math.round(prices.scale.month.amount / 100)
                    : Math.round(prices.scale.year.amount / 100 / 12)}
                </span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <ul className="space-y-2 mb-4 text-sm">
                {PLANS.scale.features.slice(0, 4).map((feature, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => handleUpgrade('scale')}
                disabled={loading !== null || !canManageBilling}
                className="w-full"
              >
                {loading === 'scale' && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Get Scale
              </Button>
            </Card>
          </div>
        </div>
      )}

      {/* Billing History */}
      {hasActivePlan && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">Billing History</h3>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="uncollectible">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            {invoicesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CreditCard className="w-10 h-10 text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No invoices found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Date</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Description</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Amount</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.map((invoice) => (
                      <tr key={invoice.id} className="border-b last:border-0">
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            {new Date(invoice.date * 1000).toLocaleDateString('en-US', {
                              month: 'short',
                              day: '2-digit',
                              year: 'numeric',
                            })}
                          </div>
                        </td>
                        <td className="p-4 text-sm">{invoice.description}</td>
                        <td className="p-4 font-medium">
                          ${(invoice.amount / 100).toFixed(2)}
                        </td>
                        <td className="p-4">
                          <Badge
                            variant={invoice.status === 'paid' ? 'default' : invoice.status === 'open' ? 'secondary' : 'destructive'}
                            className={cn(
                              "capitalize",
                              invoice.status === 'paid' && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            )}
                          >
                            {invoice.status === 'paid' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                            {invoice.status === 'uncollectible' && <XCircle className="w-3 h-3 mr-1" />}
                            {invoice.status}
                          </Badge>
                        </td>
                        <td className="p-4">
                          {invoice.invoicePdf ? (
                            <Button variant="ghost" size="sm" asChild>
                              <a href={invoice.invoicePdf} target="_blank" rel="noopener noreferrer">
                                <Download className="w-4 h-4 mr-1" />
                                Download
                              </a>
                            </Button>
                          ) : (
                            <span className="text-sm text-muted-foreground italic">No invoice</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Manage Billing Link */}
          {canManageBilling && (
            <div className="mt-4 flex justify-end">
              <Button variant="outline" onClick={handleManageBilling} disabled={loading === 'portal'}>
                {loading === 'portal' ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <ExternalLink className="w-4 h-4 mr-2" />
                )}
                Manage Billing in Stripe
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Permission Notice */}
      {!canManageBilling && (
        <p className="text-sm text-muted-foreground text-center">
          Only the organization owner can manage billing. Your role: <span className="font-medium capitalize">{userRole}</span>
        </p>
      )}
    </div>
  )
}
