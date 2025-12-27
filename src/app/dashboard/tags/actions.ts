'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type Tag = {
  id: string
  organization_id: string
  name: string
  color: string
  created_at: string
}

// Get all tags for user's organization
export async function getTags(): Promise<Tag[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // Get user's organization
  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .single()

  if (!membership) return []

  const { data: tags, error } = await supabase
    .from('tags')
    .select('*')
    .eq('organization_id', membership.organization_id)
    .is('deleted_at', null)
    .order('name')

  if (error) {
    console.error('Error fetching tags:', error)
    return []
  }

  return tags || []
}

// Create a new tag
export async function createTag(name: string, color: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Get user's organization
  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .single()

  if (!membership) return { error: 'User has no organization' }

  const { data: tag, error } = await supabase
    .from('tags')
    .insert({
      organization_id: membership.organization_id,
      name,
      color,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/settings/tags')
  revalidatePath('/dashboard/projects')
  return { success: true, tag }
}

// Update a tag
export async function updateTag(tagId: string, updates: { name?: string; color?: string }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: tag, error } = await supabase
    .from('tags')
    .update(updates)
    .eq('id', tagId)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/settings/tags')
  revalidatePath('/dashboard/projects')
  return { success: true, tag }
}

// Delete a tag (soft delete)
export async function deleteTag(tagId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Soft delete the tag
  const { error: updateError } = await supabase
    .from('tags')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', tagId)

  if (updateError) {
    return { error: updateError.message }
  }

  // Delete all project_tags associations
  const { error: deleteError } = await supabase
    .from('project_tags')
    .delete()
    .eq('tag_id', tagId)

  if (deleteError) {
    return { error: deleteError.message }
  }

  revalidatePath('/dashboard/settings/tags')
  revalidatePath('/dashboard/projects')
  return { success: true }
}

// Get tags for a specific project
export async function getProjectTags(projectId: string): Promise<Tag[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('project_tags')
    .select('tag_id, tags(*)')
    .eq('project_id', projectId)

  if (error) {
    console.error('Error fetching project tags:', error)
    return []
  }

  return (data?.map(pt => pt.tags).filter(Boolean) || []) as Tag[]
}

// Add tag to project
export async function addTagToProject(projectId: string, tagId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('project_tags')
    .insert({
      project_id: projectId,
      tag_id: tagId,
    })

  if (error) {
    // Ignore duplicate errors
    if (error.code === '23505') {
      return { success: true }
    }
    return { error: error.message }
  }

  revalidatePath('/dashboard/projects')
  revalidatePath(`/dashboard/projects/${projectId}`)
  return { success: true }
}

// Remove tag from project
export async function removeTagFromProject(projectId: string, tagId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('project_tags')
    .delete()
    .eq('project_id', projectId)
    .eq('tag_id', tagId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/projects')
  revalidatePath(`/dashboard/projects/${projectId}`)
  return { success: true }
}

// Set all tags for a project (replace existing)
export async function setProjectTags(projectId: string, tagIds: string[]) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Delete all existing tags
  await supabase
    .from('project_tags')
    .delete()
    .eq('project_id', projectId)

  // Insert new tags
  if (tagIds.length > 0) {
    const { error } = await supabase
      .from('project_tags')
      .insert(
        tagIds.map(tagId => ({
          project_id: projectId,
          tag_id: tagId,
        }))
      )

    if (error) {
      return { error: error.message }
    }
  }

  revalidatePath('/dashboard/projects')
  revalidatePath(`/dashboard/projects/${projectId}`)
  return { success: true }
}

// Create tag and add to project in one action
export async function createAndAddTag(projectId: string, name: string, color: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Get user's organization
  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .single()

  if (!membership) return { error: 'User has no organization' }

  // Create tag
  const { data: tag, error: createError } = await supabase
    .from('tags')
    .insert({
      organization_id: membership.organization_id,
      name,
      color,
    })
    .select()
    .single()

  if (createError) {
    return { error: createError.message }
  }

  // Add to project
  const { error: addError } = await supabase
    .from('project_tags')
    .insert({
      project_id: projectId,
      tag_id: tag.id,
    })

  if (addError) {
    return { error: addError.message }
  }

  revalidatePath('/dashboard/projects')
  revalidatePath(`/dashboard/projects/${projectId}`)
  revalidatePath('/dashboard/settings/tags')
  return { success: true, tag }
}

// Get tag usage count (number of projects using each tag)
export async function getTagUsageCounts(): Promise<Record<string, number>> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return {}

  const { data, error } = await supabase
    .from('project_tags')
    .select('tag_id')

  if (error) {
    console.error('Error fetching tag usage:', error)
    return {}
  }

  const counts: Record<string, number> = {}
  data?.forEach(pt => {
    counts[pt.tag_id] = (counts[pt.tag_id] || 0) + 1
  })

  return counts
}
