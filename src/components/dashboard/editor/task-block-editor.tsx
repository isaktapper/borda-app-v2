'use client'

import { format } from 'date-fns'
import { Calendar as CalendarIcon, Plus, X, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent } from '@/components/ui/card'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'

interface Task {
    id: string
    title: string
    description?: string
    dueDate?: string
}

interface TaskBlockContent {
    tasks: Task[]
}

interface TaskBlockEditorProps {
    content: TaskBlockContent
    onChange: (updates: Partial<TaskBlockContent>) => void
}

export function TaskBlockEditor({ content, onChange }: TaskBlockEditorProps) {
    const tasks = content.tasks || []

    const addTask = () => {
        const newTask: Task = {
            id: Math.random().toString(36).substring(7),
            title: '',
        }
        onChange({ tasks: [...tasks, newTask] })
    }

    const updateTask = (id: string, updates: Partial<Task>) => {
        onChange({
            tasks: tasks.map(task =>
                task.id === id ? { ...task, ...updates } : task
            )
        })
    }

    const removeTask = (id: string) => {
        onChange({ tasks: tasks.filter(task => task.id !== id) })
    }

    return (
        <Card className="w-full border shadow-sm bg-card overflow-hidden">
            <CardContent className="p-5 space-y-3">
                {tasks.map((task, index) => (
                    <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30 group">
                        <div className="pt-1">
                            <Checkbox disabled className="size-4" />
                        </div>

                        <div className="flex-1 space-y-2 min-w-0">
                            <Input
                                value={task.title}
                                onChange={(e) => updateTask(task.id, { title: e.target.value })}
                                placeholder="Uppgift..."
                                className="border-none p-0 h-auto text-sm font-medium focus-visible:ring-0 bg-transparent"
                            />

                            <div className="flex items-center gap-2">
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 px-2 text-xs"
                                                onClick={() => {
                                                    const desc = prompt('Description:', task.description || '')
                                                    if (desc !== null) updateTask(task.id, { description: desc })
                                                }}
                                            >
                                                {task.description ? '📝 Description' : '+ Description'}
                                            </Button>
                                        </TooltipTrigger>
                                        {task.description && (
                                            <TooltipContent>
                                                <p className="max-w-xs text-xs">{task.description}</p>
                                            </TooltipContent>
                                        )}
                                    </Tooltip>
                                </TooltipProvider>

                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className={cn(
                                                "h-6 px-2 text-xs gap-1",
                                                !task.dueDate && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="size-3" />
                                            {task.dueDate ? format(new Date(task.dueDate), "d MMM") : 'Date'}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={task.dueDate ? new Date(task.dueDate) : undefined}
                                            onSelect={(date) => updateTask(task.id, { dueDate: date?.toISOString() })}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>

                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                            onClick={() => removeTask(task.id)}
                        >
                            <X className="size-3" />
                        </Button>
                    </div>
                ))}

                <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-8 border-dashed"
                    onClick={addTask}
                >
                    <Plus className="size-4 mr-2" />
                    Add task
                </Button>
            </CardContent>
        </Card>
    )
}
