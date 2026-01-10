import { Skeleton } from "@/components/ui/skeleton"

export default function TemplatesLoading() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="border-b pb-3">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-64 mt-2" />
      </div>

      {/* Table skeleton */}
      <div className="rounded-md border">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr className="border-b">
              <th className="p-3 text-left"><Skeleton className="h-4 w-24" /></th>
              <th className="p-3 text-left"><Skeleton className="h-4 w-32" /></th>
              <th className="p-3 text-left"><Skeleton className="h-4 w-20" /></th>
              <th className="p-3 text-left"><Skeleton className="h-4 w-16" /></th>
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, i) => (
              <tr key={i} className="border-b">
                <td className="p-3"><Skeleton className="h-4 w-full" /></td>
                <td className="p-3"><Skeleton className="h-4 w-32" /></td>
                <td className="p-3"><Skeleton className="h-4 w-24" /></td>
                <td className="p-3"><Skeleton className="h-8 w-8 rounded" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
