import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { canUseAITemplates } from '@/lib/permissions'
import { AITemplateForm } from '@/components/dashboard/ai-template-form'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Sparkles, Lock } from 'lucide-react'

interface PageProps {
  searchParams: Promise<{ name?: string; description?: string }>
}

export default async function AITemplateWizardPage({ searchParams }: PageProps) {
  const { name, description } = await searchParams
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user's organization
  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    redirect('/templates')
  }

  // Check permission
  const hasPermission = await canUseAITemplates(membership.organization_id)

  if (!hasPermission) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-6 py-12">
          {/* Header */}
          <div className="mb-12">
            <Link href="/templates">
              <Button variant="ghost" size="sm" className="gap-2 -ml-2 mb-6">
                <ArrowLeft className="h-4 w-4" />
                Back to Templates
              </Button>
            </Link>
          </div>

          {/* Upgrade prompt */}
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-6">
              <Lock className="h-8 w-8 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-semibold mb-3">AI Templates is a Scale Feature</h1>
            <p className="text-muted-foreground max-w-md mx-auto mb-8">
              Upgrade to Scale to unlock AI-powered template generation. Create professional implementation templates in seconds.
            </p>
            <Link href="/settings/billing">
              <Button size="lg" className="gap-2">
                <Sparkles className="h-5 w-5" />
                Upgrade to Scale
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12">
          <Link href="/templates">
            <Button variant="ghost" size="sm" className="gap-2 -ml-2 mb-6">
              <ArrowLeft className="h-4 w-4" />
              Back to Templates
            </Button>
          </Link>

          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold">{name || 'Create with AI'}</h1>
                <Badge variant="outline" className="text-xs">Beta</Badge>
              </div>
              {description && (
                <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
              )}
            </div>
          </div>
          {!description && (
            <p className="text-muted-foreground">
              Describe your implementation process or upload existing documentation, and we&apos;ll generate a complete template for you.
            </p>
          )}
        </div>

        {/* Form */}
        <AITemplateForm templateName={name} templateDescription={description} />
      </div>
    </div>
  )
}
