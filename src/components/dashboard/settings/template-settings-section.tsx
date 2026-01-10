'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, LayoutTemplate, CheckCircle, ArrowRight, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { saveAsTemplate } from '@/app/(app)/templates/actions'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface TemplateSettingsSectionProps {
    spaceId: string
    spaceName: string
}

export function TemplateSettingsSection({ spaceId, spaceName }: TemplateSettingsSectionProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [saved, setSaved] = useState(false)
    const [templateName, setTemplateName] = useState(`${spaceName} Template`)
    const [templateDescription, setTemplateDescription] = useState('')
    const [limitReached, setLimitReached] = useState(false)
    const [limitError, setLimitError] = useState<string | null>(null)

    const handleSaveAsTemplate = async () => {
        if (!templateName.trim()) {
            toast.error('Please enter a template name')
            return
        }

        setLoading(true)
        setLimitReached(false)
        setLimitError(null)
        
        try {
            const result = await saveAsTemplate(spaceId, templateName.trim(), templateDescription.trim() || undefined)
            
            if (result.error) {
                if (result.limitReached) {
                    setLimitReached(true)
                    setLimitError(result.error)
                } else {
                    toast.error(result.error)
                }
            } else {
                setSaved(true)
                toast.success('Template saved successfully!')
            }
        } catch (error) {
            toast.error('Failed to save template')
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const handleViewTemplates = () => {
        router.push('/templates')
    }

    if (saved) {
        return (
            <div className="rounded-lg border bg-muted/30 p-8 text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                    <CheckCircle className="size-8 text-green-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Template Saved!</h3>
                <p className="text-sm text-muted-foreground mb-6">
                    Your space has been saved as "{templateName}". You can now use it to create new spaces.
                </p>
                <div className="flex gap-3 justify-center">
                    <Button variant="outline" onClick={() => setSaved(false)}>
                        Save Another
                    </Button>
                    <Button onClick={handleViewTemplates} className="gap-2">
                        View Templates
                        <ArrowRight className="size-4" />
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Info Card */}
            <div className="rounded-lg border bg-muted/30 p-4 flex items-start gap-4">
                <div className="p-2 rounded-lg bg-primary/10">
                    <LayoutTemplate className="size-5 text-primary" />
                </div>
                <div className="flex-1">
                    <h4 className="font-medium mb-1">Save as Template</h4>
                    <p className="text-sm text-muted-foreground">
                        Create a reusable template from this space. All pages and blocks will be included.
                        Tasks, files, and customer data will not be copied.
                    </p>
                </div>
            </div>

            {/* Form */}
            <div className="divide-y rounded-lg border">
                {/* Template Name */}
                <div className="grid grid-cols-[300px_1fr] p-4 items-center">
                    <Label htmlFor="template-name" className="text-sm font-medium">
                        Template Name
                    </Label>
                    <div className="flex justify-end">
                        <Input
                            id="template-name"
                            value={templateName}
                            onChange={(e) => setTemplateName(e.target.value)}
                            placeholder="Enter template name"
                            className="w-96"
                        />
                    </div>
                </div>

                {/* Description */}
                <div className="grid grid-cols-[300px_1fr] p-4 items-start">
                    <Label htmlFor="template-description" className="text-sm font-medium pt-2">
                        Description
                        <span className="text-muted-foreground font-normal ml-1">(optional)</span>
                    </Label>
                    <div className="flex justify-end">
                        <Textarea
                            id="template-description"
                            value={templateDescription}
                            onChange={(e) => setTemplateDescription(e.target.value)}
                            placeholder="Describe what this template is for..."
                            className="w-96 resize-none"
                            rows={3}
                        />
                    </div>
                </div>
            </div>

            {/* Limit Reached Warning */}
            {limitReached && limitError && (
                <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="size-5 text-amber-600 mt-0.5 shrink-0" />
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">{limitError}</p>
                            <Link 
                                href="/settings?tab=billing" 
                                className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                            >
                                Upgrade now <ArrowRight className="size-3" />
                            </Link>
                        </div>
                    </div>
                </div>
            )}

            {/* Action Button */}
            <div className="flex justify-end pt-4 border-t">
                <Button onClick={handleSaveAsTemplate} disabled={loading || limitReached} className="gap-2">
                    {loading ? (
                        <Loader2 className="size-4 animate-spin" />
                    ) : (
                        <LayoutTemplate className="size-4" />
                    )}
                    Save as Template
                </Button>
            </div>
        </div>
    )
}

