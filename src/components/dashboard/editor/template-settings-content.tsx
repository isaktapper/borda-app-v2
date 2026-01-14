'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Trash2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { deleteTemplate } from '@/app/(app)/templates/actions'

interface TemplateSettingsContentProps {
    templateId: string
    name: string
    description: string
    skipWeekends: boolean
    onUpdate: (
        name: string,
        description: string,
        skipWeekends: boolean
    ) => Promise<void>
    isSaving: boolean
}

export function TemplateSettingsContent({
    templateId,
    name,
    description,
    skipWeekends,
    onUpdate,
    isSaving,
}: TemplateSettingsContentProps) {
    const router = useRouter()
    const [localName, setLocalName] = useState(name)
    const [localDescription, setLocalDescription] = useState(description)
    const [localSkipWeekends, setLocalSkipWeekends] = useState(skipWeekends)
    const [isDeleting, setIsDeleting] = useState(false)
    const [hasChanges, setHasChanges] = useState(false)

    const handleChange = (
        field: 'name' | 'description' | 'skipWeekends',
        value: string | boolean
    ) => {
        setHasChanges(true)
        switch (field) {
            case 'name':
                setLocalName(value as string)
                break
            case 'description':
                setLocalDescription(value as string)
                break
            case 'skipWeekends':
                setLocalSkipWeekends(value as boolean)
                break
        }
    }

    const handleSave = async () => {
        await onUpdate(localName, localDescription, localSkipWeekends)
        setHasChanges(false)
    }

    const handleDelete = async () => {
        setIsDeleting(true)
        const result = await deleteTemplate(templateId)
        if (result.success) {
            router.push('/templates')
        }
        setIsDeleting(false)
    }

    return (
        <div className="h-full overflow-auto">
            <div className="max-w-2xl mx-auto p-8 space-y-10">
                {/* Basic Info Section */}
                <section id="basic-info" className="space-y-6">
                    <div>
                        <h2 className="text-xl font-semibold">Basic Info</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            Template name and description
                        </p>
                    </div>

                    <div className="space-y-4 bg-card border rounded-lg p-6">
                        <div className="space-y-2">
                            <Label htmlFor="template-name">Template Name</Label>
                            <Input
                                id="template-name"
                                value={localName}
                                onChange={(e) => handleChange('name', e.target.value)}
                                placeholder="e.g., Enterprise Onboarding"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="template-description">Description</Label>
                            <Textarea
                                id="template-description"
                                value={localDescription}
                                onChange={(e) => handleChange('description', e.target.value)}
                                placeholder="Describe what this template is for..."
                                rows={3}
                            />
                        </div>

                        {hasChanges && (
                            <Button onClick={handleSave} disabled={isSaving} className="mt-2">
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Changes
                            </Button>
                        )}
                    </div>
                </section>

                {/* Date Scheduling Section */}
                <section id="date-scheduling" className="space-y-6">
                    <div>
                        <h2 className="text-xl font-semibold">Date Scheduling</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            Configure how task due dates are calculated
                        </p>
                    </div>

                    <div className="space-y-4 bg-card border rounded-lg p-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <Label htmlFor="skip-weekends" className="font-medium">
                                    Skip Weekends
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                    Only count business days when calculating dates
                                </p>
                            </div>
                            <Switch
                                id="skip-weekends"
                                checked={localSkipWeekends}
                                onCheckedChange={(checked) => handleChange('skipWeekends', checked)}
                            />
                        </div>

                        <div className="pt-4 border-t">
                            <p className="text-sm text-muted-foreground">
                                <strong>Note:</strong> Due dates are now configured per-task. 
                                Each task can be set relative to either the space creation date 
                                or the go-live date.
                            </p>
                        </div>

                        {hasChanges && (
                            <Button onClick={handleSave} disabled={isSaving} className="mt-2">
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Changes
                            </Button>
                        )}
                    </div>
                </section>

                {/* Danger Zone Section */}
                <section id="danger-zone" className="space-y-6">
                    <div>
                        <h2 className="text-xl font-semibold text-destructive">Danger Zone</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            Irreversible and destructive actions
                        </p>
                    </div>

                    <div className="border border-destructive/20 rounded-lg p-6 bg-destructive/5">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <h3 className="font-medium">Delete Template</h3>
                                <p className="text-sm text-muted-foreground">
                                    Permanently delete this template. This action cannot be undone.
                                </p>
                            </div>

                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="sm">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete Template
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle className="flex items-center gap-2">
                                            <AlertTriangle className="h-5 w-5 text-destructive" />
                                            Delete Template
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Are you sure you want to delete <strong>{localName}</strong>?
                                            This action cannot be undone. Spaces created from this template
                                            will not be affected.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={handleDelete}
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            disabled={isDeleting}
                                        >
                                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Delete
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    )
}
