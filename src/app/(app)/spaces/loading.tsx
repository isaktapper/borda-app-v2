import { SpaceStatsSkeleton, SpacesTableSkeleton } from "@/components/ui/skeletons"
import { Skeleton } from "@/components/ui/skeleton"

export default function SpacesLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-3">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-10 w-32 rounded-md" />
      </div>

      {/* Stats Strip */}
      <SpaceStatsSkeleton />

      {/* Spaces Table */}
      <SpacesTableSkeleton />
    </div>
  )
}
