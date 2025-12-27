interface ActionSectionProps<T> {
  title: string
  icon: React.ReactNode
  progress: { done: number; total: number }
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  emptyMessage?: string
}

export function ActionSection<T>({
  title,
  icon,
  progress,
  items,
  renderItem,
  emptyMessage = `No ${title.toLowerCase()} in this project`
}: ActionSectionProps<T>) {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <div className="text-muted-foreground">{icon}</div>
          <span className="font-medium">{title}</span>
        </div>
        <span className="text-sm text-muted-foreground">
          {progress.done}/{progress.total} done
        </span>
      </div>

      {/* Items */}
      {items.length > 0 ? (
        <div className="divide-y divide-border">
          {items.map((item, index) => renderItem(item, index))}
        </div>
      ) : (
        <div className="p-4 text-center text-muted-foreground text-sm">
          {emptyMessage}
        </div>
      )}
    </div>
  )
}
