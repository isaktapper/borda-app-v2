'use client'

import { Type, Target, CheckSquare, HelpCircle, Upload, Download, Video, User, Minus, Image as ImageIcon, List, ChevronLeft, GitBranch, Zap, BarChart3 } from 'lucide-react'
import { TextBlockEditor } from './text-block-editor'
import { ActionPlanBlockEditor } from './action-plan-block-editor'
import { TaskBlockEditor } from './task-block-editor'
import { FormBlockEditor } from './form-block-editor'
import { FileUploadBlockEditor } from './file-upload-block-editor'
import { FileDownloadBlockEditor } from './file-download-block-editor'
import { EmbedBlockEditor } from './embed-block-editor'
import { ContactCardBlockEditor } from './contact-card-block-editor'
import { DividerBlockEditor } from './divider-block-editor'
import { MediaBlockEditor } from './media-block-editor'
import { AccordionBlockEditor } from './accordion-block-editor'
import { TimelineBlockEditor } from './timeline-block-editor'
import { NextTaskBlockEditor } from './next-task-block-editor'
import { ActionPlanProgressBlockEditor } from './action-plan-progress-block-editor'

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
    onBack: () => void
    isTemplateMode?: boolean
}

function getBlockTitle(block: Block): string {
    // Try to get title from content
    if (block.content?.title) {
        return block.content.title
    }
    
    // For text blocks, extract from HTML
    if (block.type === 'text' && block.content?.html) {
        const text = block.content.html.replace(/<[^>]*>/g, '').trim()
        if (text) {
            return text.slice(0, 40) + (text.length > 40 ? '...' : '')
        }
    }
    
    // For other block types with specific content
    if (block.type === 'contact' && block.content?.name) {
        return block.content.name
    }
    
    if (block.type === 'file_upload' && block.content?.label) {
        return block.content.label
    }
    
    if (block.type === 'embed' && block.content?.url) {
        return 'Embedded content'
    }
    
    return 'Untitled'
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
    timeline: {
        label: 'Timeline',
        description: 'Visual journey with phases',
        icon: GitBranch
    },
    next_task: {
        label: 'Next Task',
        description: 'Display the most relevant upcoming task',
        icon: Zap
    },
    action_plan_progress: {
        label: 'Progress',
        description: 'Visual overview of action plan progress',
        icon: BarChart3
    },
    media: {
        label: 'Media',
        description: 'Image with title and description',
        icon: ImageIcon
    },
    accordion: {
        label: 'Accordion',
        description: 'Collapsible content sections',
        icon: List
    },
    // Deprecated: task block replaced by action_plan
    task: {
        label: 'To-do List (Deprecated)',
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
    // Deprecated: divider block no longer available for new blocks
    divider: {
        label: 'Divider (Deprecated)',
        description: 'Visual separator between sections',
        icon: Minus
    }
}

export function EditorTabContent({
    editingBlock,
    spaceId,
    onBlockChange,
    onBack,
    isTemplateMode = false,
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

    const blockTitle = getBlockTitle(editingBlock)

    return (
        <div className="flex flex-col h-full">
            {/* Header - matching pages/blocks design */}
            <div className="p-4 border-b">
                <div className="flex items-center justify-center relative">
                    {/* Back button */}
                    <button
                        onClick={onBack}
                        className="absolute left-0 p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ChevronLeft className="size-5" />
                    </button>

                    {/* Centered text */}
                    <div className="flex flex-col items-center text-center">
                        <span className="text-xs text-muted-foreground">{config.label}</span>
                        <h3 className="font-semibold text-base">{blockTitle}</h3>
                    </div>
                </div>
            </div>

            {/* Scrollable editor content */}
            <div className="flex-1 overflow-y-auto">
                <BlockEditorRouter
                    block={editingBlock}
                    spaceId={spaceId}
                    onChange={(updates) => onBlockChange(editingBlock.id, updates)}
                    isTemplateMode={isTemplateMode}
                />
            </div>
        </div>
    )
}

interface BlockEditorRouterProps {
    block: Block
    spaceId: string
    onChange: (updates: any) => void
    isTemplateMode?: boolean
}

function BlockEditorRouter({ block, spaceId, onChange, isTemplateMode = false }: BlockEditorRouterProps) {
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
                    isTemplateMode={isTemplateMode}
                />
            )
        case 'media':
            return (
                <MediaBlockEditor
                    blockId={block.id}
                    spaceId={spaceId}
                    content={block.content}
                    onChange={onChange}
                />
            )
        case 'accordion':
            return (
                <AccordionBlockEditor
                    content={block.content}
                    onChange={onChange}
                />
            )
        case 'timeline':
            return (
                <TimelineBlockEditor
                    content={block.content}
                    onChange={onChange}
                />
            )
        case 'next_task':
            return (
                <NextTaskBlockEditor
                    content={block.content}
                    onChange={onChange}
                    spaceId={spaceId}
                />
            )
        case 'action_plan_progress':
            return (
                <ActionPlanProgressBlockEditor
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
                    blockId={block.id}
                    spaceId={spaceId}
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
