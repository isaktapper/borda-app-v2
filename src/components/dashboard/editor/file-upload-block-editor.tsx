'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { BlockEditorWrapper } from './block-editor-wrapper'

interface FileUploadBlockContent {
    label: string
    description?: string
    acceptedTypes: string[]
    maxFiles: number
}

interface FileUploadBlockEditorProps {
    content: FileUploadBlockContent
    onChange: (content: FileUploadBlockContent) => void
}

const FILE_TYPE_GROUPS = [
    {
        id: 'images',
        label: 'Images',
        types: ['image/png', 'image/jpeg', 'image/svg+xml', 'image/gif'],
        extensions: ['png', 'jpg', 'svg', 'gif']
    },
    {
        id: 'docs',
        label: 'Documents',
        types: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        extensions: ['pdf', 'doc', 'docx']
    },
    {
        id: 'spreadsheets',
        label: 'Spreadsheets',
        types: ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        extensions: ['csv', 'xls', 'xlsx']
    },
    {
        id: 'archives',
        label: 'Archives',
        types: ['application/zip'],
        extensions: ['zip']
    }
]

export function FileUploadBlockEditor({ content, onChange }: FileUploadBlockEditorProps) {
    const handleTypeToggle = (typeList: string[]) => {
        const currentTypes = content.acceptedTypes || []
        const hasAll = typeList.every(t => currentTypes.includes(t))

        let newTypes: string[]
        if (hasAll) {
            newTypes = currentTypes.filter(t => !typeList.includes(t))
        } else {
            newTypes = Array.from(new Set([...currentTypes, ...typeList]))
        }

        onChange({ ...content, acceptedTypes: newTypes })
    }

    return (
        <BlockEditorWrapper blockType="file_upload">
            <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="label">Title<span className="text-destructive">*</span></Label>
                    <Input
                        id="label"
                        placeholder="e.g. Logo, Contract, Invoice"
                        value={content.label || ''}
                        onChange={(e) => onChange({ ...content, label: e.target.value })}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="maxFiles">Max number of files</Label>
                    <Input
                        id="maxFiles"
                        type="number"
                        min={1}
                        max={10}
                        value={content.maxFiles || 1}
                        onChange={(e) => onChange({ ...content, maxFiles: parseInt(e.target.value) || 1 })}
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                    id="description"
                    placeholder="e.g. Upload your logo in SVG or PNG format"
                    value={content.description || ''}
                    onChange={(e) => onChange({ ...content, description: e.target.value })}
                />
            </div>

            <div className="space-y-3">
                <Label>Allowed file types</Label>
                <div className="space-y-2">
                    {FILE_TYPE_GROUPS.map((group) => {
                        const isChecked = group.types.every(t => (content.acceptedTypes || []).includes(t))

                        return (
                            <label
                                key={group.id}
                                className="flex items-center gap-2 cursor-pointer"
                            >
                                <Checkbox
                                    checked={isChecked}
                                    onCheckedChange={() => handleTypeToggle(group.types)}
                                />
                                <span className="text-sm">
                                    {group.label}
                                    <span className="text-muted-foreground ml-1">
                                        ({group.extensions.join(', ')})
                                    </span>
                                </span>
                            </label>
                        )
                    })}
                </div>
            </div>

            </div>
        </BlockEditorWrapper>
    )
}
