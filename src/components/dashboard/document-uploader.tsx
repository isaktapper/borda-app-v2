'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, FileText, FileSpreadsheet, Presentation, File } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

export interface UploadedDocument {
  id: string
  fileName: string
  text: string
  charCount: number
  status: 'uploading' | 'success' | 'error'
  progress: number
  error?: string
}

interface DocumentUploaderProps {
  documents: UploadedDocument[]
  onDocumentsChange: (documents: UploadedDocument[]) => void
  maxFiles?: number
  disabled?: boolean
}

const ACCEPTED_TYPES = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'application/vnd.ms-powerpoint': ['.ppt'],
  'text/plain': ['.txt'],
}

function getFileIcon(fileName: string) {
  const ext = fileName.toLowerCase().split('.').pop()
  switch (ext) {
    case 'pdf':
      return <FileText className="h-5 w-5 text-red-500" />
    case 'doc':
    case 'docx':
      return <FileText className="h-5 w-5 text-blue-500" />
    case 'xls':
    case 'xlsx':
      return <FileSpreadsheet className="h-5 w-5 text-green-500" />
    case 'ppt':
    case 'pptx':
      return <Presentation className="h-5 w-5 text-orange-500" />
    default:
      return <File className="h-5 w-5 text-gray-500" />
  }
}

export function DocumentUploader({
  documents,
  onDocumentsChange,
  maxFiles = 5,
  disabled = false,
}: DocumentUploaderProps) {
  const [isUploading, setIsUploading] = useState(false)

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

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (disabled || isUploading) return
      
      // Limit files
      const remainingSlots = maxFiles - documents.length
      const filesToUpload = acceptedFiles.slice(0, remainingSlots)
      
      if (filesToUpload.length === 0) return

      setIsUploading(true)

      // Add placeholder documents
      const placeholders: UploadedDocument[] = filesToUpload.map(file => ({
        id: crypto.randomUUID(),
        fileName: file.name,
        text: '',
        charCount: 0,
        status: 'uploading',
        progress: 30,
      }))

      onDocumentsChange([...documents, ...placeholders])

      // Upload files
      const results = await Promise.all(filesToUpload.map(uploadFile))

      // Update with results
      const currentDocs = documents
      const updatedDocs = [...currentDocs]
      
      results.forEach((result, index) => {
        const placeholderIndex = currentDocs.length + index
        if (placeholderIndex < updatedDocs.length + results.length) {
          updatedDocs.push(result)
        }
      })

      // Replace placeholders with actual results
      const finalDocs = documents.filter(d => !placeholders.find(p => p.id === d.id))
      onDocumentsChange([...finalDocs, ...results])
      
      setIsUploading(false)
    },
    [documents, onDocumentsChange, maxFiles, disabled, isUploading]
  )

  const removeDocument = (id: string) => {
    onDocumentsChange(documents.filter(d => d.id !== id))
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxFiles: maxFiles - documents.length,
    disabled: disabled || documents.length >= maxFiles,
    multiple: true,
  })

  const canAddMore = documents.length < maxFiles && !disabled

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
          isDragActive && 'border-primary bg-primary/5',
          !canAddMore && 'opacity-50 cursor-not-allowed',
          canAddMore && !isDragActive && 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30'
        )}
      >
        <input {...getInputProps()} />
        <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
        {isDragActive ? (
          <p className="text-sm text-primary font-medium">Drop files here...</p>
        ) : (
          <>
            <p className="text-sm font-medium mb-1">
              {canAddMore ? 'Drag & drop files here' : 'Maximum files reached'}
            </p>
            <p className="text-xs text-muted-foreground">
              {canAddMore ? (
                <>PDF, Word, Excel, PowerPoint, or text files (max {maxFiles} files)</>
              ) : (
                <>Remove a file to add more</>
              )}
            </p>
          </>
        )}
      </div>

      {/* Uploaded files list */}
      {documents.length > 0 && (
        <div className="space-y-2">
          {documents.map(doc => (
            <div
              key={doc.id}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg border bg-card',
                doc.status === 'error' && 'border-destructive/50 bg-destructive/5'
              )}
            >
              {getFileIcon(doc.fileName)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{doc.fileName}</p>
                {doc.status === 'uploading' && (
                  <Progress value={doc.progress} className="h-1 mt-1" />
                )}
                {doc.status === 'success' && (
                  <p className="text-xs text-muted-foreground">
                    {doc.charCount.toLocaleString()} characters
                  </p>
                )}
                {doc.status === 'error' && (
                  <p className="text-xs text-destructive">{doc.error}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => removeDocument(doc.id)}
                disabled={doc.status === 'uploading'}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
