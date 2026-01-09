import { getTemplates } from "./actions"
import { TemplatesTable } from "@/components/dashboard/templates-table"

export default async function TemplatesPage() {
    const templates = await getTemplates()

    return (
        <div className="space-y-4">
            <div className="border-b pb-3">
                <h1 className="text-2xl font-semibold tracking-tight">Templates</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Manage your space templates.</p>
            </div>

            {templates.length === 0 ? (
                <div className="flex flex-col items-center justify-center border border-dashed rounded py-8 text-center">
                    <h3 className="text-sm font-semibold mb-1">No  yet</h3>
                    <p className="text-xs text-muted-foreground">
                        Create a space and save it as a template to reuse the structure.
                    </p>
                </div>
            ) : (
                <TemplatesTable templates={templates} />
            )}
        </div>
    )
}
