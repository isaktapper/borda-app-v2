'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Plus, Loader2, FileText, Sparkles } from "lucide-react"
import { createEmptyTemplate } from "@/app/(app)/templates/actions"
import { useRouter } from 'next/navigation'
import { cn } from "@/lib/utils"

interface CreateTemplateModalProps {
    trigger?: React.ReactNode
    canUseAI?: boolean
}

type CreationMethod = 'scratch' | 'ai'

export function CreateTemplateModal({ trigger, canUseAI = false }: CreateTemplateModalProps = {}) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [creationMethod, setCreationMethod] = useState<CreationMethod>('scratch')
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const router = useRouter()

    const handleContinue = async (e: React.FormEvent) => {
        e.preventDefault()
        
        if (!name.trim()) {
            setError('Template name is required')
            return
        }

        // If AI method selected, navigate to AI wizard with name/description
        if (creationMethod === 'ai') {
            const params = new URLSearchParams()
            params.set('name', name.trim())
            if (description.trim()) {
                params.set('description', description.trim())
            }
            setOpen(false)
            router.push(`/templates/new/ai?${params.toString()}`)
            return
        }

        setError(null)
        setLoading(true)

        const result = await createEmptyTemplate(name.trim(), description.trim() || undefined)

        if (result.error) {
            setError(result.error)
            setLoading(false)
            return
        }

        if (result.templateId) {
            setOpen(false)
            setLoading(false)
            setName('')
            setDescription('')
            router.push(`/templates/${result.templateId}`)
        }
    }

    const handleOpenChange = (newOpen: boolean) => {
        if (!loading) {
            setOpen(newOpen)
            if (!newOpen) {
                // Reset form on close
                setError(null)
                setName('')
                setDescription('')
                setCreationMethod('scratch')
            }
        }
    }

    const isFormValid = name.trim().length > 0

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button className="gap-2">
                        <Plus className="size-4" />
                        New Template
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
                <form onSubmit={handleContinue}>
                    <DialogHeader>
                        <DialogTitle>Create New Template</DialogTitle>
                        <DialogDescription>
                            Create a reusable template for your spaces. Templates help you quickly set up new projects with predefined pages and blocks.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-5 py-5">
                        {/* Creation Method Selection */}
                        <div className="space-y-3">
                            <Label className="text-sm font-medium">How would you like to start?</Label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setCreationMethod('scratch')}
                                    className={cn(
                                        "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all text-left",
                                        creationMethod === 'scratch'
                                            ? "border-primary bg-primary/5"
                                            : "border-border hover:border-primary/50 hover:bg-muted/50"
                                    )}
                                >
                                    <FileText className={cn(
                                        "size-6",
                                        creationMethod === 'scratch' ? "text-primary" : "text-muted-foreground"
                                    )} />
                                    <div className="text-center">
                                        <p className={cn(
                                            "text-sm font-medium",
                                            creationMethod === 'scratch' ? "text-primary" : "text-foreground"
                                        )}>
                                            Start from scratch
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            Build page by page
                                        </p>
                                    </div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => canUseAI && setCreationMethod('ai')}
                                    disabled={!canUseAI}
                                    className={cn(
                                        "relative flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all text-left",
                                        !canUseAI && "border-dashed opacity-60 cursor-not-allowed",
                                        canUseAI && creationMethod === 'ai'
                                            ? "border-primary bg-primary/5"
                                            : canUseAI
                                            ? "border-border hover:border-primary/50 hover:bg-muted/50"
                                            : "border-border"
                                    )}
                                >
                                    <Sparkles className={cn(
                                        "size-6",
                                        canUseAI && creationMethod === 'ai' ? "text-primary" : "text-muted-foreground"
                                    )} />
                                    <div className="text-center">
                                        <p className={cn(
                                            "text-sm font-medium",
                                            canUseAI && creationMethod === 'ai' ? "text-primary" : canUseAI ? "text-foreground" : "text-muted-foreground"
                                        )}>
                                            Create with AI
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {canUseAI ? 'Describe or upload docs' : 'Scale plan required'}
                                        </p>
                                    </div>
                                    {canUseAI ? (
                                        <Badge variant="outline" className="absolute -top-2 -right-2 text-[10px] px-1.5 bg-background">
                                            Beta
                                        </Badge>
                                    ) : (
                                        <Badge variant="secondary" className="absolute -top-2 -right-2 text-[10px] px-1.5">
                                            Scale
                                        </Badge>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Template Name */}
                        <div className="space-y-2">
                            <Label htmlFor="templateName">Template Name *</Label>
                            <Input
                                id="templateName"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g., Enterprise Onboarding"
                                disabled={loading}
                            />
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <Label htmlFor="templateDescription">Description (Optional)</Label>
                            <Textarea
                                id="templateDescription"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Describe what this template is for..."
                                rows={3}
                                disabled={loading}
                            />
                        </div>

                        {/* Error Display */}
                        {error && (
                            <p className="text-sm font-medium text-destructive">{error}</p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleOpenChange(false)}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading || !isFormValid}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Continue
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
