'use server'

import { createClient } from '@/lib/supabase/server'
import { slugify } from '@/lib/sluggify'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function createOrganization(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const name = formData.get('name') as string
    if (!name) {
        return { error: 'Organization name is required' }
    }

    let slug = slugify(name)
    const domain = formData.get('domain') as string | null

    // Ensure unique slug
    let isUnique = false
    let attempts = 0
    while (!isUnique && attempts < 5) {
        const checkSlug = attempts === 0 ? slug : `${slug}-${attempts + 1}`
        const { data } = await supabase
            .from('organizations')
            .select('id')
            .eq('slug', checkSlug)
            .single()

        if (!data) {
            slug = checkSlug
            isUnique = true
        } else {
            attempts++
        }
    }

    if (!isUnique) {
        return { error: 'Could not generate a unique handle for this organization' }
    }

    // Use RPC for atomic creation and to bypass RLS for initial setup
    const { error: rpcError } = await supabase.rpc('create_organization_rpc', {
        p_name: name,
        p_slug: slug,
        p_domain: domain || null
    })

    if (rpcError) {
        return { error: rpcError.message }
    }

    revalidatePath('/', 'layout')
    redirect('/projects')
}

export async function joinOrganization(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const orgId = formData.get('orgId') as string
    if (!orgId) {
        return { error: 'Organization ID is required' }
    }

    const { error } = await supabase
        .from('organization_members')
        .insert({
            organization_id: orgId,
            user_id: user.id,
            role: 'member',
            invited_email: user.email,
            invited_by: user.id,
            invited_at: new Date().toISOString()
        })

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/', 'layout')
    redirect('/projects')
}
