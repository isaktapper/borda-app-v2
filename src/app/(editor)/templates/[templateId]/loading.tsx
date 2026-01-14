import { Loader2 } from 'lucide-react'

export default function TemplateEditorLoading() {
    return (
        <div className="h-screen flex items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading template editor...</p>
            </div>
        </div>
    )
}
