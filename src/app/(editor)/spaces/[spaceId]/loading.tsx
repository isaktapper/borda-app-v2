import { Skeleton } from "@/components/ui/skeleton"

export default function SpaceEditorLoading() {
  return (
    <div className="h-screen flex flex-col">
      {/* Header skeleton */}
      <div className="border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className="border-b px-6">
        <div className="flex gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-20" />
          ))}
        </div>
      </div>

      {/* Content skeleton */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex">
          {/* Sidebar */}
          <div className="w-64 border-r p-4 space-y-3">
            <Skeleton className="h-10 w-full rounded-md" />
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-8 w-full rounded" />
            ))}
          </div>

          {/* Main editor area */}
          <div className="flex-1 p-8 space-y-4">
            <Skeleton className="h-8 w-64" />
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
