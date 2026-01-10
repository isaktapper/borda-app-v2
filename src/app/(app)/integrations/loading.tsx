import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"

export default function IntegrationsLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b pb-4">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-96 mt-2" />
      </div>

      {/* Integration Cards */}
      <div className="space-y-4">
        {[...Array(2)].map((_, i) => (
          <Card key={i} className="p-6">
            <div className="flex items-start gap-4">
              <Skeleton className="h-12 w-12 rounded-lg" />
              <div className="flex-1 space-y-3">
                <div className="space-y-2">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-full max-w-md" />
                </div>
                <Skeleton className="h-10 w-32 rounded-md" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
