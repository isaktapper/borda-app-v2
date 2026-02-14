'use client'

import * as React from 'react'
import { Bar, BarChart as RechartsBarChart, CartesianGrid, XAxis } from 'recharts'
import { Clock, Zap, MousePointerClick, BarChart3, Timer, CalendarIcon } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { getAnalyticsData } from './actions'
import type { AnalyticsData, KPIMetric } from './actions'
import type { LucideIcon } from 'lucide-react'
import { subDays, subMonths, format } from 'date-fns'
import type { DateRange } from 'react-day-picker'

interface AnalyticsClientProps {
  data: AnalyticsData
}

// === Stat Card Strip (Preline-style) ===

interface StatItem {
  title: string
  icon: LucideIcon
  metric: KPIMetric
  formatValue: (v: number) => string
  formatPrevious?: (v: number) => string
}

function TrendBadge({ changePercent }: { changePercent: number | null }) {
  if (changePercent === null) return null

  const isPositive = changePercent >= 0

  return (
    <span
      className={cn(
        'ms-1 inline-flex items-center gap-1 py-0.5 px-1.5 rounded-md text-xs font-medium',
        isPositive
          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
          : 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400'
      )}
    >
      {isPositive ? (
        <svg className="inline-block size-3" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
          <path d="m7.247 4.86-4.796 5.481c-.566.647-.106 1.659.753 1.659h9.592a1 1 0 0 0 .753-1.659l-4.796-5.48a1 1 0 0 0-1.506 0z"/>
        </svg>
      ) : (
        <svg className="inline-block size-3" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
          <path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z"/>
        </svg>
      )}
      <span>{Math.abs(changePercent)}%</span>
    </span>
  )
}

function StatCardStrip({ items }: { items: StatItem[] }) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 bg-card border border-border shadow-sm rounded-xl overflow-hidden">
      {items.map((item, index) => {
        const Icon = item.icon
        const hasData = item.metric.current !== null

        return (
          <div
            key={item.title}
            className={cn(
              'block p-4 md:p-5 relative bg-card transition-colors',
              'before:absolute before:top-0 before:start-0 before:w-full before:h-px sm:before:h-full sm:before:w-px before:bg-border',
              index === 0 && 'before:bg-transparent'
            )}
          >
            <div className="flex flex-col gap-y-3">
              <Icon className="shrink-0 size-5 text-muted-foreground" />

              <div className="grow">
                <p className="text-xs uppercase font-medium text-foreground tracking-wide">
                  {item.title}
                </p>
                <h3 className="mt-1 text-xl sm:text-2xl font-semibold text-primary">
                  {hasData ? item.formatValue(item.metric.current!) : '—'}
                </h3>
                {hasData && (item.metric.previous !== null || item.metric.changePercent !== null) && (
                  <div className="mt-1 flex justify-between items-center">
                    {item.metric.previous !== null && (
                      <p className="text-sm text-muted-foreground">
                        from{' '}
                        <span className="font-semibold text-foreground">
                          {item.formatPrevious
                            ? item.formatPrevious(item.metric.previous)
                            : item.formatValue(item.metric.previous)}
                        </span>
                      </p>
                    )}
                    <TrendBadge changePercent={item.metric.changePercent} />
                  </div>
                )}
                {!hasData && (
                  <p className="mt-1 text-sm text-muted-foreground">No data yet</p>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// === Date Range Presets ===

type PresetKey = '7d' | '30d' | '90d' | '12m' | 'all'

const presets: { key: PresetKey; label: string }[] = [
  { key: '7d', label: '7d' },
  { key: '30d', label: '30d' },
  { key: '90d', label: '90d' },
  { key: '12m', label: '12m' },
  { key: 'all', label: 'All time' },
]

function getPresetRange(key: PresetKey): { from: Date; to: Date } {
  const now = new Date()
  switch (key) {
    case '7d': return { from: subDays(now, 7), to: now }
    case '30d': return { from: subDays(now, 30), to: now }
    case '90d': return { from: subDays(now, 90), to: now }
    case '12m': return { from: subMonths(now, 12), to: now }
    case 'all': return { from: new Date('2020-01-01'), to: now }
  }
}

// === Main Component ===

export function AnalyticsClient({ data: initialData }: AnalyticsClientProps) {
  const [data, setData] = React.useState(initialData)
  const [activePreset, setActivePreset] = React.useState<PresetKey | null>('90d')
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(() => {
    const r = getPresetRange('90d')
    return { from: r.from, to: r.to }
  })
  const [calendarOpen, setCalendarOpen] = React.useState(false)
  const [isPending, startTransition] = React.useTransition()

  const fetchData = React.useCallback((from: Date, to: Date) => {
    startTransition(async () => {
      const result = await getAnalyticsData(from.toISOString(), to.toISOString())
      setData(result)
    })
  }, [])

  const handlePreset = React.useCallback((key: PresetKey) => {
    const range = getPresetRange(key)
    setActivePreset(key)
    setDateRange({ from: range.from, to: range.to })
    setCalendarOpen(false)
    fetchData(range.from, range.to)
  }, [fetchData])

  const handleCalendarSelect = React.useCallback((range: DateRange | undefined) => {
    setDateRange(range)
    if (range?.from && range?.to) {
      setActivePreset(null)
      setCalendarOpen(false)
      fetchData(range.from, range.to)
    }
  }, [fetchData])

  const { kpis, portalActivity, onboardingVelocity } = data

  const statItems: StatItem[] = [
    {
      title: 'Avg. Onboarding Time',
      icon: Clock,
      metric: kpis.avgOnboardingTime,
      formatValue: (v) => `${v}`,
      formatPrevious: (v) => `${v} days`,
    },
    {
      title: 'Engagement Score',
      icon: Zap,
      metric: kpis.engagementScore,
      formatValue: (v) => `${v}`,
    },
    {
      title: 'Avg. Time to First Access',
      icon: MousePointerClick,
      metric: kpis.avgTimeToFirstAccess,
      formatValue: (v) => `${v}`,
      formatPrevious: (v) => `${v} days`,
    },
  ]

  const dateLabel = dateRange?.from && dateRange?.to
    ? `${format(dateRange.from, 'MMM d, yyyy')} – ${format(dateRange.to, 'MMM d, yyyy')}`
    : 'Select dates'

  return (
    <div className={cn('space-y-6', isPending && 'opacity-60 pointer-events-none transition-opacity')}>
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Key metrics and performance insights for your onboarding.
          </p>
        </div>

        {/* Date Range Picker */}
        <div className="flex items-center gap-1">
          {presets.map((p) => (
            <Button
              key={p.key}
              variant={activePreset === p.key ? 'default' : 'ghost'}
              size="sm"
              className="h-8 text-xs px-3"
              onClick={() => handlePreset(p.key)}
            >
              {p.label}
            </Button>
          ))}
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant={activePreset === null ? 'outline' : 'ghost'}
                size="sm"
                className={cn(
                  'h-8 text-xs gap-1.5 px-3',
                  activePreset === null && 'border-primary'
                )}
              >
                <CalendarIcon className="size-3.5" />
                {activePreset === null ? dateLabel : 'Custom'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={handleCalendarSelect}
                numberOfMonths={2}
                disabled={{ after: new Date() }}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* KPI Stat Strip */}
      <StatCardStrip items={statItems} />

      {/* Portal Activity Chart (full width) */}
      <PortalActivityChart data={portalActivity} />

      {/* Onboarding Velocity Chart (full width) */}
      <OnboardingVelocityChart data={onboardingVelocity} />
    </div>
  )
}

// === Portal Activity Chart (Interactive Bar Chart) ===

const portalChartConfig = {
  visits: {
    label: 'Visits',
    color: 'var(--chart-1)',
  },
  activities: {
    label: 'Activities',
    color: 'var(--chart-2)',
  },
} satisfies ChartConfig

function PortalActivityChart({ data }: { data: AnalyticsData['portalActivity'] }) {
  const [activeChart, setActiveChart] = React.useState<'visits' | 'activities'>('visits')

  const totals = React.useMemo(() => ({
    visits: data.reduce((acc, curr) => acc + curr.visits, 0),
    activities: data.reduce((acc, curr) => acc + curr.activities, 0),
  }), [data])

  const hasData = data.some(d => d.visits > 0 || d.activities > 0)

  if (!hasData) {
    return (
      <Card className="py-0">
        <CardHeader className="px-6 pt-4 pb-3">
          <CardTitle className="text-sm font-semibold">Portal Activity</CardTitle>
          <CardDescription>Daily customer visits and activities for the selected period</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[250px]">
          <div className="text-center text-muted-foreground">
            <BarChart3 className="size-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No portal activity yet</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="py-0">
      <CardHeader className="flex flex-col items-stretch border-b !p-0 sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3 sm:!py-0">
          <CardTitle className="text-sm font-semibold">Portal Activity</CardTitle>
          <CardDescription>Daily customer visits and activities for the selected period</CardDescription>
        </div>
        <div className="flex">
          {(['visits', 'activities'] as const).map((key) => (
            <button
              key={key}
              data-active={activeChart === key}
              className="data-[active=true]:bg-muted/50 relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l sm:border-t-0 sm:border-l sm:px-8 sm:py-6"
              onClick={() => setActiveChart(key)}
            >
              <span className="text-muted-foreground text-xs">
                {portalChartConfig[key].label}
              </span>
              <span className="text-lg leading-none font-bold sm:text-3xl">
                {totals[key].toLocaleString()}
              </span>
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        <ChartContainer
          config={portalChartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <RechartsBarChart
            accessibilityLayer
            data={data}
            margin={{ left: 12, right: 12 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })
              }}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="w-[150px]"
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  }}
                />
              }
            />
            <Bar dataKey={activeChart} fill={`var(--color-${activeChart})`} />
          </RechartsBarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// === Onboarding Velocity Chart (Full-width bar chart) ===

const velocityChartConfig = {
  Spaces: {
    label: 'Spaces',
    color: 'var(--chart-1)',
  },
} satisfies ChartConfig

function OnboardingVelocityChart({ data }: { data: AnalyticsData['onboardingVelocity'] }) {
  const hasData = data.some(d => d.Spaces > 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Timer className="size-4 text-muted-foreground" />
          Onboarding Velocity
        </CardTitle>
        <CardDescription>Distribution of completion times across spaces</CardDescription>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <ChartContainer config={velocityChartConfig}>
            <RechartsBarChart accessibilityLayer data={data}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="bucket"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Bar dataKey="Spaces" fill="var(--color-Spaces)" radius={8} />
            </RechartsBarChart>
          </ChartContainer>
        ) : (
          <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
            <Timer className="size-8 mb-2 opacity-30" />
            <p className="text-sm">No completed spaces yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
