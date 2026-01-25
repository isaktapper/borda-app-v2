import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { canUseAITemplates } from '@/lib/permissions'
import { AITemplateCreator } from '@/components/dashboard/ai-template-creator'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Sparkles, Lock } from 'lucide-react'

export default async function AITemplateWizardPage() {
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
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="max-w-md mx-auto px-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-6">
            <Lock className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-semibold mb-3">AI Templates is a Scale Feature</h1>
          <p className="text-muted-foreground mb-8">
            Upgrade to Scale to unlock AI-powered template generation. Create professional implementation templates in seconds.
          </p>
          <div className="flex flex-col gap-3">
            <Link href="/settings/billing">
              <Button size="lg" className="w-full gap-2">
                <Sparkles className="h-5 w-5" />
                Upgrade to Scale
              </Button>
            </Link>
            <Link href="/templates">
              <Button variant="ghost" size="lg" className="w-full gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Templates
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return <AITemplateCreator />
}
