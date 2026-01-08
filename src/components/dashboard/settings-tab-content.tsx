'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { saveAsTemplate } from '@/app/(app)/templates/actions'
import { toast } from 'sonner'
import { Save } from 'lucide-react'

interface SettingsTabContentProps {
    spaceId: string
}

export function SettingsTabContent({ spaceId }: SettingsTabContentProps) {
    const [dialogOpen, setDialogOpen] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [templateName, setTemplateName] = useState('')
    const [templateDescription, setTemplateDescription] = useState('')

    const handleSaveAsTemplate = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)
        try {
            const result = await saveAsTemplate(spaceId, templateName, templateDescription)
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success('Template saved successfully')
                setDialogOpen(false)
                setTemplateName('')
                setTemplateDescription('')
            }
        } catch (error) {
            toast.error('Failed to save template')
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="space-y-6">
                <div>
                    <h3 className="text-lg font-semibold mb-2">Templates</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        Save this project as a template to reuse its structure for future projects.
                    </p>

                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2">
                                <Save className="h-4 w-4" />
                                Save as template
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Save as template</DialogTitle>
                                <DialogDescription>
                                    Create a reusable template from this project. All pages and blocks will be saved.
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleSaveAsTemplate}>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="templateName">Template name *</Label>
                                        <Input
                                            id="templateName"
                                            placeholder="e.g. Standard Onboarding"
                                            value={templateName}
                                            onChange={(e) => setTemplateName(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="templateDescription">Description</Label>
                                        <Textarea
                                            id="templateDescription"
                                            placeholder="Describe what this template is for..."
                                            value={templateDescription}
                                            onChange={(e) => setTemplateDescription(e.target.value)}
                                            rows={3}
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setDialogOpen(false)}
                                        disabled={isSaving}
                                    >
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={isSaving}>
                                        {isSaving ? 'Saving...' : 'Save template'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
        </div>
    )
}
