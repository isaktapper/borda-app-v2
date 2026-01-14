'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { DocumentUploader, type UploadedDocument } from './document-uploader'
import { AIGeneratingState } from './ai-generating-state'
import { Sparkles, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

const MAX_DESCRIPTION_LENGTH = 5000

interface AITemplateFormProps {
  templateName?: string
  templateDescription?: string
}

export function AITemplateForm({ templateName, templateDescription }: AITemplateFormProps) {
  const router = useRouter()
  const [description, setDescription] = useState('')
  const [documents, setDocuments] = useState<UploadedDocument[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const successfulDocuments = documents.filter(d => d.status === 'success')
  const hasValidInput = description.trim().length > 0 || successfulDocuments.length > 0
  const isUploadingDocuments = documents.some(d => d.status === 'uploading')

  const handleGenerate = async () => {
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
          name: templateName,
          templateDescription: templateDescription,
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
    // Note: We can't actually cancel the API request, but we can navigate away
    router.push('/templates')
  }

  if (isGenerating) {
    return <AIGeneratingState onCancel={handleCancel} />
  }

  return (
    <div className="space-y-8">
      {/* Description */}
      <div className="space-y-3">
        <Label htmlFor="description" className="text-base font-medium">
          Describe your implementation plan
        </Label>
        <Textarea
          id="description"
          placeholder="Describe your customer onboarding process, implementation phases, key milestones, and typical timeline. For example:

'We have a 30-day enterprise onboarding process that includes:
- Week 1: Kickoff meeting, requirements gathering, access setup
- Week 2-3: Technical integration, data migration, custom configuration  
- Week 4: User training, UAT, go-live preparation
- Go-live: Final checks, launch, immediate support'"
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESCRIPTION_LENGTH))}
          className="min-h-[200px] resize-none text-base leading-relaxed"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Be as detailed as possible for better results</span>
          <span>{description.length.toLocaleString()} / {MAX_DESCRIPTION_LENGTH.toLocaleString()}</span>
        </div>
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-4 text-muted-foreground">
            or upload existing documents
          </span>
        </div>
      </div>

      {/* Document uploader */}
      <div className="space-y-3">
        <Label className="text-base font-medium">
          Upload your documentation
        </Label>
        <p className="text-sm text-muted-foreground">
          Upload implementation guides, SOWs, project plans, or any documents that describe your process
        </p>
        <DocumentUploader
          documents={documents}
          onDocumentsChange={setDocuments}
          maxFiles={5}
        />
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-destructive">Generation failed</p>
            <p className="text-sm text-destructive/80 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Submit button */}
      <div className="pt-4">
        <Button
          size="lg"
          onClick={handleGenerate}
          disabled={!hasValidInput || isUploadingDocuments}
          className="w-full h-12 text-base gap-2"
        >
          <Sparkles className="h-5 w-5" />
          Generate Template
        </Button>
        {!hasValidInput && (
          <p className="text-center text-sm text-muted-foreground mt-3">
            Add a description or upload documents to continue
          </p>
        )}
      </div>
    </div>
  )
}
