'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Template, TemplateData } from '@/lib/types/templates'

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
  if (!user) throw new Error('Not authenticated')

  // Soft delete
  const { error } = await supabase
    .from('templates')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', templateId)

  if (error) {
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

export async function createSpaceFromTemplate(
  templateId: string,
  clientName: string,
  projectName?: string,
  targetGoLiveDate?: string
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

  // Get template
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
      target_go_live_date: targetGoLiveDate || null,
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
      const { error: blockError } = await supabase
        .from('blocks')
        .insert({
          page_id: page.id,
          type: templateBlock.type,
          sort_order: templateBlock.sort_order,
          content: templateBlock.content
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
