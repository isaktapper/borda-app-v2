'use client'

import { useState, useEffect, useRef } from 'react'
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
import { Plus, Calendar as CalendarIcon, Loader2, Upload, X } from "lucide-react"
import { createProject } from "@/app/(app)/projects/actions"
import { createProjectFromTemplate, getTemplates } from "@/app/(app)/templates/actions"
import { uploadClientLogo } from "@/app/(app)/projects/[projectId]/client-logo-actions"
import { useRouter } from 'next/navigation'
import { format } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { Template } from "@/lib/types/templates"

export function CreateProjectModal() {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [date, setDate] = useState<Date>()
    const [selectedTemplate, setSelectedTemplate] = useState<string>('blank')
    const [templates, setTemplates] = useState<Template[]>([])
    const [logoFile, setLogoFile] = useState<File | null>(null)
    const [logoPreview, setLogoPreview] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const router = useRouter()

    useEffect(() => {
        if (open) {
            getTemplates().then(setTemplates)
        }
    }, [open])

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setLogoFile(file)
            // Create preview
            const reader = new FileReader()
            reader.onloadend = () => {
                setLogoPreview(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleRemoveLogo = () => {
        setLogoFile(null)
        setLogoPreview(null)
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        setError(null)

        const clientName = formData.get('clientName') as string
        const projectName = formData.get('projectName') as string
        const targetGoLiveDate = date?.toISOString().split('T')[0]

        let result

        if (selectedTemplate && selectedTemplate !== 'blank') {
            // Create from template
            result = await createProjectFromTemplate(
                selectedTemplate,
                clientName,
                projectName,
                targetGoLiveDate
            )
        } else {
            // Create blank project
            if (date) {
                formData.append('targetGoLiveDate', date.toISOString().split('T')[0])
            }
            result = await createProject(formData)
        }

        if (result.error) {
            setError(result.error)
            setLoading(false)
            return
        }

        // Upload client logo if provided
        if (result.projectId && result.organizationId && logoFile) {
            const logoFormData = new FormData()
            logoFormData.append('file', logoFile)
            const logoResult = await uploadClientLogo(result.projectId, result.organizationId, logoFormData)

            if (logoResult.error) {
                console.error('Failed to upload client logo:', logoResult.error)
                // Don't block project creation if logo upload fails
            }
        }

        setOpen(false)
        setLoading(false)
        setDate(undefined)
        setSelectedTemplate('blank')
        setLogoFile(null)
        setLogoPreview(null)
        router.refresh()
        if (result.projectId) {
            router.push(`/projects/${result.projectId}`)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <Plus className="size-4" />
                    New Project
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form action={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Create New Project</DialogTitle>
                        <DialogDescription>
                            Add a new project to your organization. Click save when you're done.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        {templates.length > 0 && (
                            <div className="grid gap-2">
                                <Label htmlFor="template">Start from template (Optional)</Label>
                                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Blank project" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="blank">Blank project</SelectItem>
                                        {templates.map((template) => (
                                            <SelectItem key={template.id} value={template.id}>
                                                {template.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {selectedTemplate && selectedTemplate !== 'blank' && (
                                    <p className="text-xs text-muted-foreground">
                                        {templates.find(t => t.id === selectedTemplate)?.description}
                                    </p>
                                )}
                            </div>
                        )}
                        <div className="grid gap-2">
                            <Label htmlFor="clientName">Client Name</Label>
                            <Input
                                id="clientName"
                                name="clientName"
                                placeholder="e.g. Acme Corp"
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="projectName">Project Name (Optional)</Label>
                            <Input
                                id="projectName"
                                name="projectName"
                                placeholder="e.g. Q4 Campaign"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Target Go-live Date (Optional)</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !date && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {date ? format(date, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={date}
                                        onSelect={setDate}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="clientLogo">Customer Logo (Optional)</Label>
                            {!logoPreview ? (
                                <div>
                                    <input
                                        ref={fileInputRef}
                                        id="clientLogo"
                                        type="file"
                                        accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                                        onChange={handleLogoChange}
                                        className="hidden"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full"
                                    >
                                        <Upload className="mr-2 h-4 w-4" />
                                        Upload Logo
                                    </Button>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        PNG, JPG, SVG, or WEBP (max 5MB)
                                    </p>
                                </div>
                            ) : (
                                <div className="relative border rounded-lg p-4 flex items-center gap-3">
                                    <img
                                        src={logoPreview}
                                        alt="Logo preview"
                                        className="h-12 w-12 object-contain"
                                    />
                                    <div className="flex-1">
                                        <p className="text-sm font-medium">{logoFile?.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {logoFile && (logoFile.size / 1024).toFixed(1)} KB
                                        </p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleRemoveLogo}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </div>
                        {error && (
                            <p className="text-sm font-medium text-destructive">{error}</p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Project
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
