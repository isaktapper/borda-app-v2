'use client'

import { useState, useEffect } from 'react'
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
import { Plus, Calendar as CalendarIcon, Loader2 } from "lucide-react"
import { createProject } from "@/app/dashboard/projects/actions"
import { createProjectFromTemplate, getTemplates } from "@/app/dashboard/templates/actions"
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
    const router = useRouter()

    useEffect(() => {
        if (open) {
            getTemplates().then(setTemplates)
        }
    }, [open])

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
        } else {
            setOpen(false)
            setLoading(false)
            setDate(undefined)
            setSelectedTemplate('blank')
            router.refresh()
            if (result.projectId) {
                router.push(`/dashboard/projects/${result.projectId}`)
            }
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
