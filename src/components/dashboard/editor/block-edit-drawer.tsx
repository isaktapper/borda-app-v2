'use client'

import { X, Type, CheckSquare, Upload, Download, HelpCircle, Video, User, Minus, Pencil } from 'lucide-react'
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
    spaceId: string
    isOpen: boolean
    onClose: () => void
    onChange: (updates: any) => void
}

const BLOCK_CONFIG: Record<string, { label: string; description: string; icon: any; color: string }> = {
    text: { 
        label: 'Text Block', 
        description: 'Rich text content with formatting',
        icon: Type, 
        color: 'from-blue-500/20 to-blue-500/5 text-blue-600 dark:text-blue-400' 
    },
    task: { 
        label: 'To-do List', 
        description: 'Checkable tasks for your client',
        icon: CheckSquare, 
        color: 'from-green-500/20 to-green-500/5 text-green-600 dark:text-green-400' 
    },
    form: { 
        label: 'Form', 
        description: 'Questions to gather information',
        icon: HelpCircle, 
        color: 'from-purple-500/20 to-purple-500/5 text-purple-600 dark:text-purple-400' 
    },
    file_upload: { 
        label: 'File Upload', 
        description: 'Let clients upload files',
        icon: Upload, 
        color: 'from-orange-500/20 to-orange-500/5 text-orange-600 dark:text-orange-400' 
    },
    file_download: { 
        label: 'File Download', 
        description: 'Share files for download',
        icon: Download, 
        color: 'from-cyan-500/20 to-cyan-500/5 text-cyan-600 dark:text-cyan-400' 
    },
    embed: { 
        label: 'Video / Embed', 
        description: 'Embed videos from YouTube, Loom, etc.',
        icon: Video, 
        color: 'from-red-500/20 to-red-500/5 text-red-600 dark:text-red-400' 
    },
    contact: { 
        label: 'Contact Card', 
        description: 'Display contact information',
        icon: User, 
        color: 'from-indigo-500/20 to-indigo-500/5 text-indigo-600 dark:text-indigo-400' 
    },
    divider: { 
        label: 'Divider', 
        description: 'Visual separator between sections',
        icon: Minus, 
        color: 'from-gray-500/20 to-gray-500/5 text-gray-600 dark:text-gray-400' 
    },
}

export function BlockEditDrawer({
    block,
    spaceId,
    isOpen,
    onClose,
    onChange
}: BlockEditDrawerProps) {
    if (!block) return null

    const config = BLOCK_CONFIG[block.type] || { 
        label: 'Block', 
        description: 'Edit block content',
        icon: Type, 
        color: 'from-primary/20 to-primary/5 text-primary' 
    }
    const Icon = config.icon

    return (
        <>
            {/* Backdrop */}
            <div
                className={cn(
                    "fixed inset-0 bg-black/40 backdrop-blur-sm transition-all duration-300 z-40",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
            />

            {/* Drawer */}
            <div
                className={cn(
                    "fixed right-0 top-0 h-full w-[480px] bg-background z-50 flex flex-col",
                    "transition-all duration-300 ease-out",
                    "shadow-2xl shadow-black/20",
                    isOpen ? "translate-x-0" : "translate-x-full"
                )}
            >
                {/* Header with gradient */}
                <div className="relative shrink-0 overflow-hidden">
                    {/* Background gradient */}
                    <div className={cn(
                        "absolute inset-0 bg-gradient-to-br opacity-50",
                        config.color.split(' ')[0],
                        config.color.split(' ')[1]
                    )} />
                    
                    {/* Pattern overlay */}
                    <div className="absolute inset-0 opacity-[0.03]" style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                    }} />
                    
                    <div className="relative p-6">
                        <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4">
                                <div className={cn(
                                    "p-3 rounded-xl bg-gradient-to-br shadow-sm",
                                    config.color
                                )}>
                                    <Icon className="size-5" />
                                </div>
                                <div className="space-y-1 pt-0.5">
                                    <h3 className="font-semibold text-lg text-foreground">
                                        {config.label}
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        {config.description}
                                    </p>
                                </div>
                            </div>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={onClose}
                                className="rounded-full -mr-2 -mt-2 hover:bg-black/5 dark:hover:bg-white/5"
                            >
                                <X className="size-5" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Divider with subtle line */}
                <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    <div className="p-6">
                        {/* Section header */}
                        <div className="flex items-center gap-2 mb-4">
                            <Pencil className="size-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                                Content
                            </span>
                        </div>
                        
                        {/* Editor content */}
                        <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
                            <BlockEditorContent
                                block={block}
                                spaceId={spaceId}
                                onChange={onChange}
                            />
                        </div>
                    </div>
                </div>

                {/* Footer hint */}
                <div className="shrink-0 px-6 py-4 border-t bg-muted/30">
                    <p className="text-xs text-muted-foreground text-center">
                        Changes are saved automatically when you close this panel
                    </p>
                </div>
            </div>
        </>
    )
}

interface BlockEditorContentProps {
    block: Block
    spaceId: string
    onChange: (updates: any) => void
}

function BlockEditorContent({ block, spaceId, onChange }: BlockEditorContentProps) {
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
                <div className="text-center text-muted-foreground py-8">
                    <p>No editor available for this block type.</p>
                </div>
            )
    }
}
