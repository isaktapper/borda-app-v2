'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Template, TemplateData, RelativeDueDate, RelativeDateDirection } from '@/lib/types/templates'
import { canCreateTemplate } from '@/lib/permissions'
import { addBusinessDays, addDays, subBusinessDays, subDays } from 'date-fns'

export async function saveAsTemplate(
  spaceId: string,
  name: string,
  description?: string
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get user's organization
  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .single()

  if (!membership) throw new Error('User has no organization')

  // Check if organization can create more templates
  const templatePermission = await canCreateTemplate(membership.organization_id)
  if (!templatePermission.allowed) {
    return { 
      error: templatePermission.message,
      limitReached: true,
      current: templatePermission.current,
      limit: templatePermission.limit,
    }
  }

  // Fetch all pages for the project
  const { data: pages, error: pagesError } = await supabase
    .from('pages')
    .select('id, title, slug, description, sort_order')
    .eq('space_id', spaceId)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })

  if (pagesError) {
    return { error: pagesError.message }
  }

  if (!pages || pages.length === 0) {
    return { error: 'No pages found for this project' }
  }

  // Fetch all blocks for each page
  const templateData: TemplateData = {
    pages: []
  }

  for (const page of pages) {
    const { data: blocks, error: blocksError } = await supabase
      .from('blocks')
      .select('type, sort_order, content')
      .eq('page_id', page.id)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true })

    if (blocksError) {
      return { error: blocksError.message }
    }

    templateData.pages.push({
      title: page.title,
      slug: page.slug,
      description: page.description || undefined,
      sort_order: page.sort_order,
      blocks: blocks || []
    })
  }

  // Save template
  const { data: template, error: templateError } = await supabase
    .from('templates')
    .insert({
      organization_id: membership.organization_id,
      name,
      description: description || null,
      template_data: templateData,
      is_public: false,
      created_by: user.id
    })
    .select()
    .single()

  if (templateError) {
    return { error: templateError.message }
  }

  revalidatePath('/templates')
  return { success: true, template }
}

export async function getTemplates() {
  const supabase = await createClient()

  // Note: User auth check is done in page.tsx with cached query
  const { data: templates, error } = await supabase
    .from('templates')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching templates:', error)
    return []
  }

  return templates as Template[]
}

export async function deleteTemplate(templateId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Get user's organization to verify ownership
  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return { error: 'User has no organization' }
  }

  // Verify template belongs to user's organization first
  const { data: template } = await supabase
    .from('templates')
    .select('id, organization_id')
    .eq('id', templateId)
    .single()

  if (!template || template.organization_id !== membership.organization_id) {
    return { error: 'Template not found or you do not have permission to delete it' }
  }

  // Use admin client to bypass RLS for the update (we already verified ownership)
  const { createAdminClient } = await import('@/lib/supabase/server')
  const adminSupabase = await createAdminClient()

  // Soft delete
  const { error } = await adminSupabase
    .from('templates')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', templateId)

  if (error) {
    console.error('Delete template error:', error)
    return { error: error.message }
  }

  revalidatePath('/templates')
  return { success: true }
}

export async function updateTemplate(
  templateId: string,
  name: string,
  description?: string
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('templates')
    .update({
      name,
      description: description || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', templateId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/templates')
  return { success: true }
}

// =============================================================================
// Template Editor Actions
// =============================================================================

/**
 * Create an empty template for the template editor
 */
export async function createEmptyTemplate(
  name: string,
  description?: string
): Promise<{ templateId?: string; error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get user's organization
  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .single()

  if (!membership) throw new Error('User has no organization')

  // Check if organization can create more templates
  const templatePermission = await canCreateTemplate(membership.organization_id)
  if (!templatePermission.allowed) {
    return { 
      error: templatePermission.message
    }
  }

  // Create empty template with no pages
  const templateData: TemplateData = {
    pages: []
  }

  const { data: template, error } = await supabase
    .from('templates')
    .insert({
      organization_id: membership.organization_id,
      name,
      description: description || null,
      template_data: templateData,
      is_public: false,
      created_by: user.id,
      reference_date_type: 'start',
      skip_weekends: true
    })
    .select('id')
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/templates')
  return { templateId: template.id }
}

/**
 * Get template with full data for the editor
 */
export async function getTemplateForEditor(
  templateId: string
): Promise<Template | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: template, error } = await supabase
    .from('templates')
    .select('*')
    .eq('id', templateId)
    .is('deleted_at', null)
    .single()

  if (error || !template) {
    console.error('Error fetching template for editor:', error)
    return null
  }

  return template as Template
}

/**
 * Update template data (pages and blocks)
 */
export async function updateTemplateData(
  templateId: string,
  templateData: TemplateData
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('templates')
    .update({
      template_data: templateData,
      updated_at: new Date().toISOString()
    })
    .eq('id', templateId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/templates')
  revalidatePath(`/templates/${templateId}`)
  return { success: true }
}

/**
 * Update template settings (name, description, date settings)
 */
export async function updateTemplateSettings(
  templateId: string,
  name: string,
  description?: string,
  skipWeekends?: boolean
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const updateData: Record<string, any> = {
    name,
    description: description || null,
    updated_at: new Date().toISOString()
  }

  if (skipWeekends !== undefined) {
    updateData.skip_weekends = skipWeekends
  }

  const { error } = await supabase
    .from('templates')
    .update(updateData)
    .eq('id', templateId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/templates')
  revalidatePath(`/templates/${templateId}`)
  return { success: true }
}

// =============================================================================
// Date Calculation Utilities
// =============================================================================

/**
 * Calculate absolute date from relative due date (new per-task direction approach)
 * @param relativeDueDate - The relative due date with days and direction
 * @param startDate - The space creation/start date
 * @param goLiveDate - The target go-live date (optional)
 * @param skipWeekends - Whether to count only business days
 */
function calculateAbsoluteDateFromRelative(
  relativeDueDate: RelativeDueDate,
  startDate: Date,
  goLiveDate: Date | null,
  skipWeekends: boolean
): string | null {
  const { days, direction } = relativeDueDate
  
  if (direction === 'after_start') {
    // X days after space is created
    if (skipWeekends) {
      return addBusinessDays(startDate, days).toISOString().split('T')[0]
    }
    return addDays(startDate, days).toISOString().split('T')[0]
  } else {
    // X days before go-live
    if (!goLiveDate) {
      // No go-live date set, can't calculate
      return null
    }
    if (skipWeekends) {
      return subBusinessDays(goLiveDate, days).toISOString().split('T')[0]
    }
    return subDays(goLiveDate, days).toISOString().split('T')[0]
  }
}

/**
 * Convert relative due dates in block content to absolute dates (new per-task direction approach)
 */
function convertRelativeDatesToAbsolute(
  content: Record<string, any>,
  blockType: string,
  startDate: Date,
  goLiveDate: Date | null,
  skipWeekends: boolean
): Record<string, any> {
  // Only process action_plan blocks
  if (blockType !== 'action_plan') {
    return content
  }

  const convertedContent = { ...content }
  
  if (convertedContent.milestones) {
    convertedContent.milestones = convertedContent.milestones.map((milestone: any) => {
      const convertedMilestone = { ...milestone }
      
      // Convert milestone relative date (new format with direction)
      if (milestone.relativeDueDate && typeof milestone.relativeDueDate === 'object') {
        const absoluteDate = calculateAbsoluteDateFromRelative(
          milestone.relativeDueDate as RelativeDueDate,
          startDate,
          goLiveDate,
          skipWeekends
        )
        if (absoluteDate) {
          convertedMilestone.dueDate = absoluteDate
        }
        delete convertedMilestone.relativeDueDate
      }
      
      // Convert task relative dates
      if (convertedMilestone.tasks) {
        convertedMilestone.tasks = convertedMilestone.tasks.map((task: any) => {
          const convertedTask = { ...task }
          
          // New format with direction object
          if (task.relativeDueDate && typeof task.relativeDueDate === 'object') {
            const absoluteDate = calculateAbsoluteDateFromRelative(
              task.relativeDueDate as RelativeDueDate,
              startDate,
              goLiveDate,
              skipWeekends
            )
            if (absoluteDate) {
              convertedTask.dueDate = absoluteDate
            }
            delete convertedTask.relativeDueDate
          }
          
          return convertedTask
        })
      }
      
      return convertedMilestone
    })
  }
  
  return convertedContent
}

// =============================================================================
// Space Creation from Template
// =============================================================================

export async function createSpaceFromTemplate(
  templateId: string,
  clientName: string,
  projectName?: string,
  startDate?: string,    // Optional start date (defaults to today)
  goLiveDate?: string    // Optional go-live date
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get user's organization
  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .single()

  if (!membership) throw new Error('User has no organization')

  // Get template with new fields
  const { data: template, error: templateError } = await supabase
    .from('templates')
    .select('*')
    .eq('id', templateId)
    .single()

  if (templateError || !template) {
    return { error: 'Template not found' }
  }

  const finalProjectName = projectName || clientName

  // Create project
  const { data: project, error: projectError } = await supabase
    .from('spaces')
    .insert({
      organization_id: membership.organization_id,
      name: finalProjectName,
      client_name: clientName,
      target_go_live_date: goLiveDate || null,
      created_by: user.id,
      status: 'active'
    })
    .select()
    .single()

  if (projectError) {
    return { error: projectError.message }
  }

  // Create project membership
  const { error: memberError } = await supabase
    .from('space_members')
    .insert({
      space_id: project.id,
      user_id: user.id,
      role: 'owner',
      joined_at: new Date().toISOString()
    })

  if (memberError) {
    // Cleanup project if membership fails
    await supabase.from('spaces').delete().eq('id', project.id)
    return { error: memberError.message }
  }

  // Set up date references for relative date conversion (per-task direction)
  const skipWeekends = template.skip_weekends ?? true
  const actualStartDate = startDate ? new Date(startDate) : new Date()
  const actualGoLiveDate = goLiveDate ? new Date(goLiveDate) : null

  // Create pages and blocks from template
  const templateData = template.template_data as TemplateData

  for (const templatePage of templateData.pages) {
    const { data: page, error: pageError } = await supabase
      .from('pages')
      .insert({
        space_id: project.id,
        title: templatePage.title,
        slug: templatePage.slug,
        description: templatePage.description || null,
        sort_order: templatePage.sort_order,
        is_visible: true
      })
      .select()
      .single()

    if (pageError) {
      console.error('Error creating page:', pageError)
      continue
    }

    // Create blocks for this page
    for (const templateBlock of templatePage.blocks) {
      // Convert relative dates to absolute dates in block content (per-task direction)
      const convertedContent = convertRelativeDatesToAbsolute(
        templateBlock.content,
        templateBlock.type,
        actualStartDate,
        actualGoLiveDate,
        skipWeekends
      )

      const { error: blockError } = await supabase
        .from('blocks')
        .insert({
          page_id: page.id,
          type: templateBlock.type,
          sort_order: templateBlock.sort_order,
          content: convertedContent
        })

      if (blockError) {
        console.error('Error creating block:', blockError)
        continue
      }

      // If it's a task block, create a task entry
      if (templateBlock.type === 'task') {
        const { error: taskError } = await supabase
          .from('tasks')
          .insert({
            page_id: page.id,
            title: templateBlock.content.title || 'Untitled task',
            description: templateBlock.content.description || null,
            status: 'pending',
            sort_order: templateBlock.sort_order
          })

        if (taskError) {
          console.error('Error creating task:', taskError)
        }
      }
    }
  }

  revalidatePath('/spaces')
  return { success: true, spaceId: project.id, organizationId: membership.organization_id }
}
