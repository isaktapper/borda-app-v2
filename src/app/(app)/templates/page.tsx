import { getTemplates } from "./actions"
import { TemplatesTable } from "@/components/dashboard/templates-table"
import { getCachedUser } from "@/lib/queries/user"
import { redirect } from "next/navigation"
import { CreateTemplateModal } from "@/components/dashboard/create-template-modal"
import { createClient } from "@/lib/supabase/server"
import { canUseAITemplates } from "@/lib/permissions"

export default async function TemplatesPage() {
    // Use cached user query (deduplicates with layout)
    const { user } = await getCachedUser()

    if (!user) {
        redirect('/login')
    }

    // Get user's organization for permission check
    const supabase = await createClient()
    const { data: membership } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

    const canUseAI = membership ? await canUseAITemplates(membership.organization_id) : false
    const templates = await getTemplates()

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
                <div>
                <h1 className="text-2xl font-semibold tracking-tight">Templates</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Manage your space templates.</p>
                </div>
                <CreateTemplateModal canUseAI={canUseAI} />
            </div>

            {templates.length === 0 ? (
                <div className="flex flex-col items-center justify-center border border-dashed rounded py-12 text-center">
                    <h3 className="text-sm font-semibold mb-1">No templates yet</h3>
                    <p className="text-xs text-muted-foreground mb-4">
                        Create a template to quickly set up new spaces with predefined pages and blocks.
                    </p>
                    <CreateTemplateModal canUseAI={canUseAI} />
                </div>
            ) : (
                <TemplatesTable templates={templates} />
            )}
        </div>
    )
}
