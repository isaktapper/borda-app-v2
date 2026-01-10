'use client'

import { Type, Target, CheckSquare, HelpCircle, Upload, Download, Video, User, Minus } from 'lucide-react'
import { TextBlockEditor } from './text-block-editor'
import { ActionPlanBlockEditor } from './action-plan-block-editor'
import { TaskBlockEditor } from './task-block-editor'
import { FormBlockEditor } from './form-block-editor'
import { FileUploadBlockEditor } from './file-upload-block-editor'
import { FileDownloadBlockEditor } from './file-download-block-editor'
import { EmbedBlockEditor } from './embed-block-editor'
import { ContactCardBlockEditor } from './contact-card-block-editor'
import { DividerBlockEditor } from './divider-block-editor'

interface Block {
    id: string
    type: string
    content: any
    sort_order: number
}

interface EditorTabContentProps {
    editingBlock: Block | null
    spaceId: string
    onBlockChange: (blockId: string, updates: any) => void
}

const BLOCK_EDITOR_CONFIG: Record<string, { label: string; description: string; icon: any }> = {
    text: {
        label: 'Text Block',
        description: 'Rich text content with formatting',
        icon: Type
    },
    action_plan: {
        label: 'Action Plan',
        description: 'Collaborative milestones and tasks',
        icon: Target
    },
    task: {
        label: 'To-do List',
        description: 'Checkable tasks for your client',
        icon: CheckSquare
    },
    form: {
        label: 'Form',
        description: 'Questions to gather information',
        icon: HelpCircle
    },
    file_upload: {
        label: 'File Upload',
        description: 'Let clients upload files',
        icon: Upload
    },
    file_download: {
        label: 'File Download',
        description: 'Share files for download',
        icon: Download
    },
    embed: {
        label: 'Video / Embed',
        description: 'Embed videos from YouTube, Loom, etc.',
        icon: Video
    },
    contact: {
        label: 'Contact Card',
        description: 'Display contact information',
        icon: User
    },
    divider: {
        label: 'Divider',
        description: 'Visual separator between sections',
        icon: Minus
    }
}

export function EditorTabContent({
    editingBlock,
    spaceId,
    onBlockChange
}: EditorTabContentProps) {
    if (!editingBlock) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground h-full">
                <p className="text-sm">Select a block to edit</p>
                <p className="text-xs mt-2">Choose a block from the Blocks tab to start editing</p>
            </div>
        )
    }

    const config = BLOCK_EDITOR_CONFIG[editingBlock.type] || {
        label: 'Block',
        description: 'Edit block content',
        icon: Type
    }

    const Icon = config.icon

    return (
        <div className="flex flex-col h-full">
            {/* Block info header */}
            <div className="p-4 border-b bg-muted/30 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="size-4 text-primary" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-sm">{config.label}</h3>
                        <p className="text-xs text-muted-foreground">{config.description}</p>
                    </div>
                </div>
            </div>

            {/* Scrollable editor content */}
            <div className="flex-1 overflow-y-auto">
                <BlockEditorRouter
                    block={editingBlock}
                    spaceId={spaceId}
                    onChange={(updates) => onBlockChange(editingBlock.id, updates)}
                />
            </div>
        </div>
    )
}

interface BlockEditorRouterProps {
    block: Block
    spaceId: string
    onChange: (updates: any) => void
}

function BlockEditorRouter({ block, spaceId, onChange }: BlockEditorRouterProps) {
    switch (block.type) {
        case 'text':
            return (
                <TextBlockEditor
                    blockId={block.id}
                    content={block.content}
                    onChange={onChange}
                />
            )
        case 'action_plan':
            return (
                <ActionPlanBlockEditor
                    content={block.content}
                    onChange={onChange}
                    spaceId={spaceId}
                />
            )
        case 'task':
            return (
                <TaskBlockEditor
                    content={block.content}
                    onChange={onChange}
                />
            )
        case 'file_upload':
            return (
                <FileUploadBlockEditor
                    content={block.content}
                    onChange={onChange}
                />
            )
        case 'file_download':
            return (
                <FileDownloadBlockEditor
                    blockId={block.id}
                    spaceId={spaceId}
                    content={block.content}
                    onChange={onChange}
                />
            )
        case 'form':
            return (
                <FormBlockEditor
                    content={block.content}
                    onChange={onChange}
                />
            )
        case 'embed':
            return (
                <EmbedBlockEditor
                    content={block.content}
                    onChange={onChange}
                />
            )
        case 'contact':
            return (
                <ContactCardBlockEditor
                    content={block.content}
                    onChange={onChange}
                />
            )
        case 'divider':
            return (
                <DividerBlockEditor
                    content={block.content}
                    onChange={onChange}
                />
            )
        default:
            return (
                <div className="p-8 text-center text-muted-foreground">
                    <p className="text-sm">No editor available for this block type.</p>
                </div>
            )
    }
}
