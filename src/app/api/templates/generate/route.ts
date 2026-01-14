import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { generateTemplate } from '@/lib/ai/template-generator'
import { canUseAITemplates } from '@/lib/permissions'
import type { TemplateData } from '@/lib/types/templates'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: 'No organization found' },
        { status: 403 }
      )
    }

    // Check permission
    const hasPermission = await canUseAITemplates(membership.organization_id)
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'AI templates requires Scale plan' },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { name, templateDescription, description, documentTexts } = body as {
      name?: string
      templateDescription?: string
      description?: string
      documentTexts?: string[]
    }

    // Validate input - need name and at least description or documents
    if (!name) {
      return NextResponse.json(
        { error: 'Template name is required' },
        { status: 400 }
      )
    }

    if (!description && (!documentTexts || documentTexts.length === 0)) {
      return NextResponse.json(
        { error: 'Please provide a description or upload documents' },
        { status: 400 }
      )
    }

    // Generate template using AI
    const result = await generateTemplate({
      description,
      documentTexts,
    })

    if (!result.success || !result.template) {
      return NextResponse.json(
        { error: result.error || 'Failed to generate template' },
        { status: 500 }
      )
    }

    // Convert AI template format to database format
    const templateData: TemplateData = {
      pages: result.template.pages.map(page => ({
        id: crypto.randomUUID(),
        title: page.title,
        slug: page.slug,
        sort_order: page.sort_order,
        blocks: page.blocks.map(block => ({
          id: crypto.randomUUID(),
          type: block.type,
          sort_order: block.sort_order,
          content: block.content as Record<string, unknown>,
        })),
      })),
    }

    // Create template in database
    // Use provided name/description, fall back to AI-generated ones
    const adminSupabase = await createAdminClient()
    const { data: template, error: createError } = await adminSupabase
      .from('templates')
      .insert({
        organization_id: membership.organization_id,
        name: name || result.template.name,
        description: templateDescription || result.template.description || null,
        template_data: templateData,
        skip_weekends: true,
        created_by: user.id,
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating template:', createError)
      return NextResponse.json(
        { error: 'Failed to save template' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      templateId: template.id,
      name: template.name,
      usage: result.usage,
    })
  } catch (error) {
    console.error('Error generating template:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate template' },
      { status: 500 }
    )
  }
}
