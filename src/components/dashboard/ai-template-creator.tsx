'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputActions,
  PromptInputAction,
} from '@/components/ui/prompt-input'
import type { UploadedDocument } from './document-uploader'
import { AIThinkingState } from './ai-thinking-state'
import { Paperclip, Send, X } from 'lucide-react'
import Image from 'next/image'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const MAX_DESCRIPTION_LENGTH = 5000
const MAX_FILES = 5

const ACCEPTED_FILE_TYPES = '.pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.txt'

export function AITemplateCreator() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [description, setDescription] = useState('')
  const [documents, setDocuments] = useState<UploadedDocument[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const successfulDocuments = documents.filter(d => d.status === 'success')
  const hasValidInput = description.trim().length > 0 || successfulDocuments.length > 0
  const isUploadingDocuments = documents.some(d => d.status === 'uploading')

  const uploadFile = async (file: File): Promise<UploadedDocument> => {
    const id = crypto.randomUUID()
    const doc: UploadedDocument = {
      id,
      fileName: file.name,
      text: '',
      charCount: 0,
      status: 'uploading',
      progress: 0,
    }

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/templates/upload-document', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Upload failed')
      }

      const result = await response.json()

      return {
        ...doc,
        text: result.text,
        charCount: result.charCount,
        status: 'success',
        progress: 100,
      }
    } catch (error) {
      return {
        ...doc,
        status: 'error',
        progress: 0,
        error: error instanceof Error ? error.message : 'Upload failed',
      }
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    // Reset file input
    e.target.value = ''

    // Limit files
    const remainingSlots = MAX_FILES - documents.length
    const filesToUpload = files.slice(0, remainingSlots)

    if (filesToUpload.length === 0) {
      toast.error(`Maximum ${MAX_FILES} files allowed`)
      return
    }

    // Add placeholder documents
    const placeholders: UploadedDocument[] = filesToUpload.map(file => ({
      id: crypto.randomUUID(),
      fileName: file.name,
      text: '',
      charCount: 0,
      status: 'uploading',
      progress: 30,
    }))

    setDocuments(prev => [...prev, ...placeholders])

    // Upload files
    const results = await Promise.all(filesToUpload.map(uploadFile))

    // Replace placeholders with actual results
    setDocuments(prev => {
      const withoutPlaceholders = prev.filter(d => !placeholders.find(p => p.id === d.id))
      return [...withoutPlaceholders, ...results]
    })
  }

  const handleSubmit = async () => {
    if (!hasValidInput || isUploadingDocuments) return

    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch('/api/templates/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: description.trim() || undefined,
          documentTexts: successfulDocuments.map(d => d.text),
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate template')
      }

      toast.success('Template created successfully!')
      router.push(`/templates/${result.templateId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setIsGenerating(false)
    }
  }

  const handleCancel = () => {
    router.push('/templates')
  }

  const handleRemoveDocument = (id: string) => {
    setDocuments(documents.filter(d => d.id !== id))
  }

  if (isGenerating) {
    return <AIThinkingState onCancel={handleCancel} />
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col">
      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl space-y-8">
          {/* Header text */}
          <div className="text-center space-y-4">
            <Image
              src="/borda_favicon_light.png"
              alt="Borda AI"
              width={48}
              height={48}
              className="mx-auto"
            />
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">Create with Borda AI</h1>
              <p className="text-muted-foreground text-base max-w-lg mx-auto leading-relaxed">
                Describe your implementation process or upload existing documents. We&apos;ll generate a complete template for you.
              </p>
            </div>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED_FILE_TYPES}
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* Prompt input */}
          <PromptInput
            value={description}
            onValueChange={(value) => setDescription(value.slice(0, MAX_DESCRIPTION_LENGTH))}
            isLoading={isUploadingDocuments}
            onSubmit={handleSubmit}
            disabled={isUploadingDocuments}
            className="shadow-lg"
          >
            {/* Files displayed inside the prompt input */}
            {documents.length > 0 && (
              <div className="flex flex-wrap gap-2 px-3 pt-3">
                {documents.map(doc => (
                  <div
                    key={doc.id}
                    className={cn(
                      'flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted text-sm',
                      doc.status === 'uploading' && 'animate-pulse',
                      doc.status === 'error' && 'bg-destructive/10 text-destructive'
                    )}
                  >
                    <Paperclip className="h-3 w-3 shrink-0" />
                    <span className="truncate max-w-[120px]">{doc.fileName}</span>
                    <button
                      onClick={() => handleRemoveDocument(doc.id)}
                      className="hover:text-destructive shrink-0"
                      disabled={doc.status === 'uploading'}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <PromptInputTextarea
              placeholder="Describe your implementation process, phases, milestones, and timeline..."
              className="min-h-[100px] text-base"
            />
            <PromptInputActions className="justify-between px-3 pb-3">
              <div className="flex items-center gap-2">
                <PromptInputAction tooltip={documents.length >= MAX_FILES ? `Maximum ${MAX_FILES} files` : 'Attach documents'}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={documents.length >= MAX_FILES}
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                </PromptInputAction>
                <span className="text-xs text-muted-foreground">
                  {description.length.toLocaleString()} / {MAX_DESCRIPTION_LENGTH.toLocaleString()}
                </span>
              </div>
              <PromptInputAction tooltip={!hasValidInput ? 'Add a description or documents first' : 'Generate template'}>
                <Button
                  size="sm"
                  className="gap-2"
                  onClick={handleSubmit}
                  disabled={!hasValidInput || isUploadingDocuments}
                >
                  <Send className="h-4 w-4" />
                  Generate
                </Button>
              </PromptInputAction>
            </PromptInputActions>
          </PromptInput>

          {/* Error message */}
          {error && (
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-center">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Helper text */}
          <p className={cn(
            "text-center text-sm text-muted-foreground",
            hasValidInput && "invisible"
          )}>
            Add a description or upload documents to generate your template
          </p>
        </div>
      </div>
    </div>
  )
}
