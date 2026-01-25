'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Plus, FileText, Sparkles, Loader2 } from "lucide-react"
import { createEmptyTemplate } from "@/app/(app)/templates/actions"
import { toast } from 'sonner'

interface CreateTemplateDropdownProps {
  canUseAI?: boolean
}

export function CreateTemplateDropdown({ canUseAI = false }: CreateTemplateDropdownProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleCreateManually = () => {
    console.log('Creating manually...')
    setLoading(true)

    createEmptyTemplate('Untitled Template', undefined).then((result) => {
      if (result.error) {
        toast.error(result.error)
        setLoading(false)
        return
      }

      if (result.templateId) {
        router.push(`/templates/${result.templateId}`)
      }
      setLoading(false)
    })
  }

  const handleCreateWithAI = () => {
    console.log('Creating with AI...')
    router.push('/templates/new/ai')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="gap-2" disabled={loading}>
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Plus className="size-4" />
          )}
          New Template
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onSelect={handleCreateManually} disabled={loading}>
          <FileText className="mr-2 h-4 w-4" />
          <div className="flex flex-col">
            <span>Create manually</span>
            <span className="text-xs text-muted-foreground">Build from scratch</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={canUseAI ? handleCreateWithAI : undefined}
          disabled={!canUseAI || loading}
        >
          <Sparkles className="mr-2 h-4 w-4" />
          <div className="flex flex-col">
            <span className="flex items-center gap-2">
              Create with AI
              {!canUseAI && (
                <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">Scale</span>
              )}
            </span>
            <span className="text-xs text-muted-foreground">
              {canUseAI ? 'Describe or upload docs' : 'Upgrade to Scale'}
            </span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
