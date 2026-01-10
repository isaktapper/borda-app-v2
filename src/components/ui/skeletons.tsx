import { Skeleton } from "./skeleton"
import { Card } from "./card"

/**
 * Skeleton for the stats strip on the spaces page (3 columns)
 */
export function SpaceStatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x bg-card/50 rounded-xl overflow-hidden">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="p-4 flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1.5 flex-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-12" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  )
}

/**
 * Skeleton for a single row in the spaces table
 */
export function SpaceTableRowSkeleton() {
  return (
    <tr className="border-b">
      <td className="p-3">
        <Skeleton className="h-4 w-4" />
      </td>
      <td className="p-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-md" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </td>
      <td className="p-3">
        <Skeleton className="h-5 w-16 rounded-full" />
      </td>
      <td className="p-3">
        <Skeleton className="h-4 w-20" />
      </td>
      <td className="p-3">
        <Skeleton className="h-8 w-8 rounded-full" />
      </td>
      <td className="p-3">
        <Skeleton className="h-4 w-12" />
      </td>
      <td className="p-3">
        <Skeleton className="h-4 w-16" />
      </td>
    </tr>
  )
}

/**
 * Skeleton for the spaces table (header + rows)
 */
export function SpacesTableSkeleton() {
  return (
    <div className="space-y-4">
      {/* Toolbar skeleton */}
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-10 w-64" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      {/* Table skeleton */}
      <div className="rounded-md border">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr className="border-b">
              <th className="p-3"><Skeleton className="h-4 w-4" /></th>
              <th className="p-3"><Skeleton className="h-4 w-24" /></th>
              <th className="p-3"><Skeleton className="h-4 w-16" /></th>
              <th className="p-3"><Skeleton className="h-4 w-20" /></th>
              <th className="p-3"><Skeleton className="h-4 w-20" /></th>
              <th className="p-3"><Skeleton className="h-4 w-16" /></th>
              <th className="p-3"><Skeleton className="h-4 w-16" /></th>
            </tr>
          </thead>
          <tbody>
            {[...Array(8)].map((_, i) => (
              <SpaceTableRowSkeleton key={i} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination skeleton */}
      <div className="flex justify-center">
        <Skeleton className="h-10 w-64" />
      </div>
    </div>
  )
}

/**
 * Skeleton for individual stat cards (used on activity, insights, etc.)
 */
export function StatCardSkeleton() {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-10 w-10 rounded-md" />
      </div>
    </Card>
  )
}

/**
 * Skeleton for a task item (used on tasks page)
 */
export function TaskSkeleton() {
  return (
    <div className="flex items-start gap-3 p-3 border rounded-lg">
      <Skeleton className="h-5 w-5 rounded mt-0.5" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-20 rounded-full" />
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Skeleton className="h-3 w-32" />
          <span className="text-muted-foreground">•</span>
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <Skeleton className="h-8 w-8 rounded-full" />
    </div>
  )
}

/**
 * Skeleton for task group (overdue, upcoming, no due date)
 */
export function TaskGroupSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-5 w-8 rounded-full" />
      </div>
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <TaskSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

/**
 * Skeleton for activity feed item
 */
export function ActivityItemSkeleton() {
  return (
    <div className="px-6 py-4 flex gap-4">
      <Skeleton className="h-10 w-10 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-6 w-6 rounded-full shrink-0" />
    </div>
  )
}

/**
 * Skeleton for activity feed with date groups
 */
export function ActivityFeedSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="divide-y">
        {[...Array(3)].map((_, i) => (
          <div key={i}>
            {/* Date header */}
            <div className="px-6 py-3 bg-muted/30 border-b">
              <Skeleton className="h-4 w-24" />
            </div>
            {/* Activity items */}
            <div className="divide-y">
              {[...Array(3)].map((_, j) => (
                <ActivityItemSkeleton key={j} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

/**
 * Skeleton for page header with title and action
 */
export function PageHeaderSkeleton() {
  return (
    <div className="flex items-center justify-between border-b pb-3">
      <div className="space-y-1">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-10 w-32 rounded-md" />
    </div>
  )
}
