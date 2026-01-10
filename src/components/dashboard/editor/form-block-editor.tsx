'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Plus, X, List, AlignLeft, Type, Calendar, CheckSquare, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { BlockEditorWrapper } from './block-editor-wrapper'

interface FormField {
    id: string
    question: string
    type: 'text' | 'textarea' | 'select' | 'multiselect' | 'date'
    options?: string[]
    required?: boolean
}

interface FormBlockContent {
    questions: FormField[]
}

interface FormBlockEditorProps {
    content: FormBlockContent
    onChange: (content: FormBlockContent) => void
}

const FIELD_TYPES = [
    { id: 'text', label: 'Short answer', icon: Type },
    { id: 'textarea', label: 'Long answer', icon: AlignLeft },
    { id: 'select', label: 'Dropdown', icon: List },
    { id: 'multiselect', label: 'Multiselect', icon: CheckSquare },
    { id: 'date', label: 'Date', icon: Calendar },
]

export function FormBlockEditor({ content, onChange }: FormBlockEditorProps) {
    const questions = content.questions || []

    const addQuestion = () => {
        const newQuestion: FormField = {
            id: Math.random().toString(36).substring(7),
            question: '',
            type: 'text',
            required: false
        }
        onChange({ questions: [...questions, newQuestion] })
    }

    const updateQuestion = (id: string, updates: Partial<FormField>) => {
        onChange({
            questions: questions.map(q =>
                q.id === id ? { ...q, ...updates } : q
            )
        })
    }

    const removeQuestion = (id: string) => {
        onChange({ questions: questions.filter(q => q.id !== id) })
    }

    const addOption = (questionId: string) => {
        const question = questions.find(q => q.id === questionId)
        if (question) {
            const options = [...(question.options || []), '']
            updateQuestion(questionId, { options })
        }
    }

    const updateOption = (questionId: string, optionIndex: number, value: string) => {
        const question = questions.find(q => q.id === questionId)
        if (question) {
            const options = [...(question.options || [])]
            options[optionIndex] = value
            updateQuestion(questionId, { options })
        }
    }

    const removeOption = (questionId: string, optionIndex: number) => {
        const question = questions.find(q => q.id === questionId)
        if (question) {
            const options = (question.options || []).filter((_, i) => i !== optionIndex)
            updateQuestion(questionId, { options })
        }
    }

    return (
        <BlockEditorWrapper blockType="form">
            <div className="space-y-3">
                {questions.map((question) => {
                    const showOptions = question.type === 'select' || question.type === 'multiselect'
                    const Icon = FIELD_TYPES.find(t => t.id === question.type)?.icon || Type

                    return (
                        <div key={question.id} className="p-4 rounded-lg border bg-muted/30 space-y-3 group">
                            <div className="flex items-start gap-3">
                                <div className="pt-2">
                                    <Icon className="size-4 text-muted-foreground" />
                                </div>
                                <div className="flex-1 space-y-3">
                                    <Input
                                        value={question.question}
                                        onChange={(e) => updateQuestion(question.id, { question: e.target.value })}
                                        placeholder="Fråga..."
                                        className="border-none p-0 h-auto text-sm font-medium focus-visible:ring-0 bg-transparent"
                                    />

                                    <div className="flex items-center gap-2 flex-wrap">
                                        <Select
                                            value={question.type}
                                            onValueChange={(val: any) => {
                                                const updates: any = { type: val }
                                                if ((val === 'select' || val === 'multiselect') && (!question.options || question.options.length === 0)) {
                                                    updates.options = ['Answer 1', 'Answer 2']
                                                }
                                                updateQuestion(question.id, updates)
                                            }}
                                        >
                                            <SelectTrigger className="h-7 w-auto text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {FIELD_TYPES.map((t) => (
                                                    <SelectItem key={t.id} value={t.id}>
                                                        <div className="flex items-center gap-2">
                                                            <t.icon className="size-3" />
                                                            {t.label}
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                                            <Checkbox
                                                checked={question.required || false}
                                                onCheckedChange={(checked) => updateQuestion(question.id, { required: checked === true })}
                                                className="size-3.5"
                                            />
                                            <span className="text-muted-foreground">Obligatorisk</span>
                                        </label>
                                    </div>

                                    {showOptions && (
                                        <div className="space-y-2 pl-4 border-l-2">
                                            {(question.options || []).map((option, index) => (
                                                <div key={index} className="flex gap-2">
                                                    <Input
                                                        placeholder={`Answer ${index + 1}`}
                                                        value={option}
                                                        onChange={(e) => updateOption(question.id, index, e.target.value)}
                                                        className="h-7 text-xs"
                                                    />
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 w-7 p-0"
                                                        onClick={() => removeOption(question.id, index)}
                                                        disabled={(question.options || []).length <= 2}
                                                    >
                                                        <X className="size-3" />
                                                    </Button>
                                                </div>
                                            ))}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 text-xs border-dashed border w-full"
                                                onClick={() => addOption(question.id)}
                                            >
                                                <Plus className="size-3 mr-1" />
                                                Answer
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                                    onClick={() => removeQuestion(question.id)}
                                >
                                    <X className="size-3" />
                                </Button>
                            </div>
                        </div>
                    )
                })}

                <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-8 border-dashed"
                    onClick={addQuestion}
                >
                    <Plus className="size-4 mr-2" />
                    Add question
                </Button>
            </div>
        </BlockEditorWrapper>
    )
}
