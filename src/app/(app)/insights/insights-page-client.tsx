'use client'

import {
  AreaChart,
  BarChart,
  DonutChart,
  BarList,
} from '@tremor/react'
import { FolderKanban, Activity, Clock, Zap, Calendar, TrendingUp, Users, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { StatCard } from '@/components/dashboard/stat-card'
import { cn } from '@/lib/utils'
import type { InsightsData } from './actions'

interface InsightsPageClientProps {
  data: InsightsData
}

export function InsightsPageClient({ data }: InsightsPageClientProps) {
  const { kpis, projectsByMonth, statusDistribution, engagementDistribution, completionFunnel, timeToAccessDistribution, upcomingProjects } = data

  // Format data for charts with proper labels
  const projectsData = projectsByMonth.map(item => ({
    month: item.month,
    'Spaces': item.count,
  }))

  const engagementData = engagementDistribution.map(item => ({
    level: item.level,
    'Spaces': item.count,
  }))

  const timeToAccessData = timeToAccessDistribution.map(item => ({
    bucket: item.bucket,
    'Customers': item.count,
  }))

  // Format funnel data for BarList
  const funnelData = completionFunnel.map((item, index) => ({
    name: item.name,
    value: item.value,
    color: index === 0 ? 'bg-blue-500' : index === 1 ? 'bg-blue-400' : 'bg-emerald-500',
  }))

  // Status colors for legend
  const statusColorMap: Record<string, string> = {
    Draft: 'bg-slate-400',
    Active: 'bg-blue-500',
    Completed: 'bg-emerald-500',
    Archived: 'bg-gray-400',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Insights</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Analytics and performance metrics for your organization.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Spaces"
          value={kpis.totalProjects}
          description="All time"
          icon={FolderKanban}
          variant="default"
        />
        <StatCard
          title="Active Spaces"
          value={kpis.activeProjects}
          description="In progress"
          icon={Activity}
          variant="success"
        />
        <StatCard
          title="Avg. Completion Time"
          value={kpis.avgCompletionDays !== null ? `${kpis.avgCompletionDays}` : '—'}
          description={kpis.avgCompletionDays !== null ? 'days' : 'No data yet'}
          icon={Clock}
          variant="warning"
        />
        <StatCard
          title="Avg. Time to First Access"
          value={kpis.avgTimeToFirstAccess !== null ? `${kpis.avgTimeToFirstAccess}` : '—'}
          description={kpis.avgTimeToFirstAccess !== null ? 'days from invite' : 'No data yet'}
          icon={Zap}
          variant="default"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Spaces Created Over Time */}
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-sm font-semibold">Spaces Created Over Time</h3>
            <p className="text-xs text-muted-foreground">Monthly breakdown of new projects</p>
          </div>
          {projectsData.some(d => d.Spaces > 0) ? (
            <AreaChart
              className="h-64"
              data={projectsData}
              index="month"
              categories={['Spaces']}
              colors={['blue']}
              showLegend={false}
              showAnimation
              curveType="monotone"
              yAxisWidth={30}
              showGridLines={false}
              valueFormatter={(value) => `${value}`}
            />
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <div className="text-center">
                <TrendingUp className="size-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No project data yet</p>
              </div>
            </div>
          )}
        </Card>

        {/* Status Distribution */}
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-sm font-semibold">Space Status Distribution</h3>
            <p className="text-xs text-muted-foreground">Current status breakdown</p>
          </div>
          {statusDistribution.length > 0 ? (
            <div className="flex flex-col items-center">
              <DonutChart
                data={statusDistribution}
                category="count"
                index="status"
                colors={['slate', 'blue', 'emerald', 'gray']}
                showLabel
                showAnimation
                className="h-48"
                valueFormatter={(value) => `${value} projects`}
              />
              {/* Legend */}
              <div className="flex flex-wrap justify-center gap-4 mt-4">
                {statusDistribution.map((item) => (
                  <div key={item.status} className="flex items-center gap-2">
                    <div className={cn('w-3 h-3 rounded-full', statusColorMap[item.status] || 'bg-gray-400')} />
                    <span className="text-xs text-muted-foreground">
                      {item.status} ({item.count})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <div className="text-center">
                <FolderKanban className="size-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No spaces yet</p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Engagement Distribution */}
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-sm font-semibold">Customer Engagement</h3>
            <p className="text-xs text-muted-foreground">Distribution by engagement level</p>
          </div>
          {engagementData.length > 0 ? (
            <BarChart
              className="h-64"
              data={engagementData}
              index="level"
              categories={['Spaces']}
              colors={['blue']}
              showLegend={false}
              showAnimation
              yAxisWidth={30}
              showGridLines={false}
              valueFormatter={(value) => `${value}`}
            />
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <div className="text-center">
                <Users className="size-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No engagement data yet</p>
              </div>
            </div>
          )}
        </Card>

        {/* Completion Funnel */}
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-sm font-semibold">Space Funnel</h3>
            <p className="text-xs text-muted-foreground">From creation to completion</p>
          </div>
          {funnelData.length > 0 && funnelData[0].value > 0 ? (
            <div className="space-y-4 mt-6">
              {funnelData.map((item, index) => {
                const maxValue = funnelData[0].value || 1
                const percentage = Math.round((item.value / maxValue) * 100)
                return (
                  <div key={item.name}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-muted-foreground">{item.name}</span>
                      <span className="font-semibold">{item.value}</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-500',
                          index === 0 ? 'bg-blue-500' : index === 1 ? 'bg-blue-400' : 'bg-emerald-500'
                        )}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {percentage}% of total
                    </p>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <div className="text-center">
                <CheckCircle2 className="size-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No funnel data yet</p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Charts Row 3 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Time to First Access */}
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-sm font-semibold">Time to First Access</h3>
            <p className="text-xs text-muted-foreground">How quickly customers access the portal after invite</p>
          </div>
          {timeToAccessData.length > 0 ? (
            <BarChart
              className="h-64"
              data={timeToAccessData}
              index="bucket"
              categories={['Customers']}
              colors={['violet']}
              showLegend={false}
              showAnimation
              yAxisWidth={30}
              showGridLines={false}
              valueFormatter={(value) => `${value}`}
            />
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <div className="text-center">
                <Zap className="size-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No access data yet</p>
              </div>
            </div>
          )}
        </Card>

        {/* Upcoming Go-Live */}
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-sm font-semibold">Upcoming Go-Live Dates</h3>
            <p className="text-xs text-muted-foreground">Spaces with go-live in the next 30 days</p>
          </div>
          {upcomingProjects.length > 0 ? (
            <div className="space-y-3">
              {upcomingProjects.map(project => (
                <Link
                  key={project.id}
                  href={`/spaces/${project.id}`}
                  className="block p-3 rounded-lg hover:bg-muted/50 transition-colors border"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{project.clientName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {project.name}
                      </p>
                    </div>
                    <span className={cn(
                      'text-xs font-medium px-2 py-0.5 rounded-full shrink-0',
                      project.daysRemaining <= 7 
                        ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400' 
                        : project.daysRemaining <= 14 
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400'
                    )}>
                      {project.daysRemaining === 0 ? 'Today' : `${project.daysRemaining}d`}
                    </span>
                  </div>
                  <div className="mt-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{project.progress}%</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Calendar className="size-8 mb-2 opacity-30" />
              <p className="text-sm">No upcoming go-live dates</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
