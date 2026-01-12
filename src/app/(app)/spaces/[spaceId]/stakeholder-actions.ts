'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface StaffMember {
    id: string
    name: string
    email: string
    avatarUrl?: string
}

export interface Stakeholder {
    id: string
    name: string
    email: string
    joinedAt?: string
}

export interface SpaceAssignees {
    staff: StaffMember[]
    stakeholders: Stakeholder[]
}

/**
 * Get all assignable people for a space (staff + stakeholders)
 */
export async function getSpaceAssignees(spaceId: string): Promise<SpaceAssignees> {
    const supabase = await createClient()

    // 1. Get the space to find its organization
    const { data: space } = await supabase
        .from('spaces')
        .select('organization_id')
        .eq('id', spaceId)
        .single()

    if (!space) {
        return { staff: [], stakeholders: [] }
    }

    // 2. Get staff members (org members)
    const { data: orgMembers } = await supabase
        .from('organization_members')
        .select(`
            user_id,
            users:user_id (
                id,
                email,
                full_name,
                avatar_url
            )
        `)
        .eq('organization_id', space.organization_id)
        .is('deleted_at', null)

    const staff: StaffMember[] = (orgMembers || [])
        .filter(m => m.users)
        .map(m => {
            const user = m.users as any
            return {
                id: user.id,
                name: user.full_name || user.email?.split('@')[0] || 'Unknown',
                email: user.email || '',
                avatarUrl: user.avatar_url
            }
        })

    // 3. Get stakeholders for this space
    const { data: stakeholderMembers } = await supabase
        .from('space_members')
        .select('id, name, invited_email, joined_at')
        .eq('space_id', spaceId)
        .eq('role', 'stakeholder')
        .is('deleted_at', null)
        .order('name', { ascending: true, nullsFirst: false })

    const stakeholders: Stakeholder[] = (stakeholderMembers || []).map(m => ({
        id: m.id,
        name: m.name || m.invited_email?.split('@')[0] || 'Unknown',
        email: m.invited_email || '',
        joinedAt: m.joined_at
    }))

    return { staff, stakeholders }
}

/**
 * Create a new stakeholder for task assignment
 * Returns the created stakeholder's ID
 */
export async function createStakeholder(
    spaceId: string,
    name: string,
    email?: string
): Promise<{ id: string } | { error: string }> {
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    // Check if stakeholder with this email already exists
    if (email) {
        const { data: existing } = await supabase
            .from('space_members')
            .select('id')
            .eq('space_id', spaceId)
            .eq('invited_email', email.toLowerCase())
            .eq('role', 'stakeholder')
            .is('deleted_at', null)
            .single()

        if (existing) {
            return { id: existing.id }
        }
    }

    // Create stakeholder
    const { data, error } = await supabase
        .from('space_members')
        .insert({
            space_id: spaceId,
            name: name.trim(),
            invited_email: email?.toLowerCase().trim() || null,
            role: 'stakeholder',
            invited_by: user.id,
            invited_at: new Date().toISOString()
        })
        .select('id')
        .single()

    if (error) {
        console.error('Error creating stakeholder:', error)
        return { error: error.message }
    }

    revalidatePath(`/spaces/${spaceId}`)
    return { id: data.id }
}

/**
 * Update a stakeholder's name or email
 */
export async function updateStakeholder(
    stakeholderId: string,
    updates: { name?: string; email?: string }
): Promise<{ success: true } | { error: string }> {
    const supabase = await createClient()

    const updateData: Record<string, string> = {}
    if (updates.name) updateData.name = updates.name.trim()
    if (updates.email) updateData.invited_email = updates.email.toLowerCase().trim()

    const { error } = await supabase
        .from('space_members')
        .update(updateData)
        .eq('id', stakeholderId)
        .eq('role', 'stakeholder')

    if (error) {
        return { error: error.message }
    }

    return { success: true }
}

/**
 * Delete a stakeholder
 */
export async function deleteStakeholder(
    stakeholderId: string,
    spaceId: string
): Promise<{ success: true } | { error: string }> {
    const supabase = await createClient()

    const { error } = await supabase
        .from('space_members')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', stakeholderId)
        .eq('role', 'stakeholder')

    if (error) {
        return { error: error.message }
    }

    revalidatePath(`/spaces/${spaceId}`)
    return { success: true }
}
