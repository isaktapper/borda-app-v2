import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"

export default function SettingsLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b pb-4">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-5 w-80 mt-2" />
      </div>

      {/* Settings Layout */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="space-y-1">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-md" />
          ))}
        </div>

        {/* Content Area */}
        <div className="md:col-span-3">
          <Card className="p-6">
            <div className="space-y-6">
              <div className="space-y-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-full max-w-md" />
              </div>

              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full rounded-md" />
                  </div>
                ))}
              </div>

              <Skeleton className="h-10 w-24 rounded-md" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
