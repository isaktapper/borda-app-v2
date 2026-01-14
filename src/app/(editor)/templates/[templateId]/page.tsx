import { notFound } from "next/navigation"
import { getTemplateForEditor } from "@/app/(app)/templates/actions"
import { TemplateEditorClient } from "@/components/dashboard/template-editor-client"

interface TemplateEditorPageProps {
    params: Promise<{ templateId: string }>
    searchParams: Promise<{ tab?: string; page?: string }>
}

export default async function TemplateEditorPage({ params, searchParams }: TemplateEditorPageProps) {
    const { templateId } = await params
    const { tab = 'editor', page } = await searchParams

    const template = await getTemplateForEditor(templateId)

    if (!template) {
        notFound()
    }

    return (
        <TemplateEditorClient
            template={template}
            templateId={templateId}
            initialTab={tab as 'editor' | 'settings'}
            initialPageId={page}
        />
    )
}
