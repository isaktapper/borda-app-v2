'use client'

import { X, Type, CheckSquare, Upload, Download, HelpCircle, Video, User, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { TextBlockEditor } from '@/components/dashboard/editor/text-block-editor'
import { TaskBlockEditor } from '@/components/dashboard/editor/task-block-editor'
import { FileUploadBlockEditor } from '@/components/dashboard/editor/file-upload-block-editor'
import { FileDownloadBlockEditor } from '@/components/dashboard/editor/file-download-block-editor'
import { FormBlockEditor } from '@/components/dashboard/editor/form-block-editor'
import { EmbedBlockEditor } from '@/components/dashboard/editor/embed-block-editor'
import { ContactCardBlockEditor } from '@/components/dashboard/editor/contact-card-block-editor'
import { DividerBlockEditor } from '@/components/dashboard/editor/divider-block-editor'

interface Block {
    id: string
    type: string
    content: any
    sort_order: number
}

interface BlockEditDrawerProps {
    block: Block | null
    projectId: string
    isOpen: boolean
    onClose: () => void
    onChange: (updates: any) => void
}

const BLOCK_LABELS: Record<string, { label: string; icon: any }> = {
    text: { label: 'Text Block', icon: Type },
    task: { label: 'To-do List', icon: CheckSquare },
    form: { label: 'Form', icon: HelpCircle },
    file_upload: { label: 'File Upload', icon: Upload },
    file_download: { label: 'File Download', icon: Download },
    embed: { label: 'Video / Embed', icon: Video },
    contact: { label: 'Contact Card', icon: User },
    divider: { label: 'Divider', icon: Minus },
}

export function BlockEditDrawer({
    block,
    projectId,
    isOpen,
    onClose,
    onChange
}: BlockEditDrawerProps) {
    if (!block) return null

    const blockInfo = BLOCK_LABELS[block.type] || { label: 'Block', icon: Type }
    const Icon = blockInfo.icon

    return (
        <>
            {/* Backdrop */}
            <div
                className={cn(
                    "fixed inset-0 bg-black/20 transition-opacity z-40",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
            />

            {/* Drawer */}
            <div
                className={cn(
                    "fixed right-0 top-0 h-full w-[450px] bg-background border-l shadow-xl z-50 flex flex-col transition-transform duration-300",
                    isOpen ? "translate-x-0" : "translate-x-full"
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                            <Icon className="size-4 text-primary" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-sm">{blockInfo.label}</h3>
                            <p className="text-xs text-muted-foreground">Edit block content</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="size-4" />
                    </Button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    <BlockEditorContent
                        block={block}
                        projectId={projectId}
                        onChange={onChange}
                    />
                </div>
            </div>
        </>
    )
}

interface BlockEditorContentProps {
    block: Block
    projectId: string
    onChange: (updates: any) => void
}

function BlockEditorContent({ block, projectId, onChange }: BlockEditorContentProps) {
    switch (block.type) {
        case 'text':
            return (
                <TextBlockEditor
                    blockId={block.id}
                    content={block.content}
                    onChange={onChange}
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
                    projectId={projectId}
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
                <div className="text-center text-muted-foreground py-8">
                    <p>No editor available for this block type.</p>
                </div>
            )
    }
}

