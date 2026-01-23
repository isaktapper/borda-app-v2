'use server'

import { createClient } from '@/lib/supabase/server'
import { slugify } from '@/lib/sluggify'
import { revalidatePath } from 'next/cache'

export async function getPages(spaceId: string) {
    const supabase = await createClient()

    const { data: pages, error } = await supabase
        .from('pages')
        .select('*')
        .eq('space_id', spaceId)
        .is('deleted_at', null)
        .order('sort_order', { ascending: true })

    if (error) {
        console.error('Error fetching pages:', error)
        return []
    }

    return (pages as any[]) || []
}

export async function createPage(spaceId: string, title: string) {
    const supabase = await createClient()

    // 1. Generate base slug
    let slug = slugify(title)

    // 2. Check for unique slug in project
    const { data: existingPages } = await supabase
        .from('pages')
        .select('slug')
        .eq('space_id', spaceId)
        .ilike('slug', `${slug}%`)

    if (existingPages && existingPages.length > 0) {
        const slugs = existingPages.map(p => p.slug)
        let count = 1
        let newSlug = slug
        while (slugs.includes(newSlug)) {
            newSlug = `${slug}-${count}`
            count++
        }
        slug = newSlug
    }

    // 3. Get next sort order
    const { data: lastPage } = await supabase
        .from('pages')
        .select('sort_order')
        .eq('space_id', spaceId)
        .order('sort_order', { ascending: false })
        .limit(1)
        .single()

    const sortOrder = lastPage ? lastPage.sort_order + 1 : 0

    // 4. Insert page
    const { data: page, error } = await supabase
        .from('pages')
        .insert({
            space_id: spaceId,
            title: title,
            slug: slug,
            sort_order: sortOrder
        })
        .select()
        .single()

    if (error) {
        return { error: error.message }
    }

    revalidatePath(`/spaces/${spaceId}`)
    return { success: true, page: page }
}

export async function deletePage(pageId: string, spaceId: string) {
    const supabase = await createClient()

    const { error } = await supabase.rpc('delete_page_rpc', {
        p_page_id: pageId
    })

    if (error) {
        return { error: error.message }
    }

    revalidatePath(`/spaces/${spaceId}`)
    return { success: true }
}

export async function renamePage(pageId: string, spaceId: string, newTitle: string) {
    const supabase = await createClient()

    // Generate new slug from title
    let slug = slugify(newTitle)

    // Check for unique slug in project (excluding current page)
    const { data: existingPages } = await supabase
        .from('pages')
        .select('id, slug')
        .eq('space_id', spaceId)
        .neq('id', pageId)
        .ilike('slug', `${slug}%`)

    if (existingPages && existingPages.length > 0) {
        const slugs = existingPages.map(p => p.slug)
        let count = 1
        let newSlug = slug
        while (slugs.includes(newSlug)) {
            newSlug = `${slug}-${count}`
            count++
        }
        slug = newSlug
    }

    const { error } = await supabase
        .from('pages')
        .update({ title: newTitle, slug })
        .eq('id', pageId)

    if (error) {
        return { error: error.message }
    }

    revalidatePath(`/spaces/${spaceId}`)
    return { success: true, slug }
}

export async function reorderPages(spaceId: string, pageIds: string[]) {
    const supabase = await createClient()

    // We do multiple updates. In a real world scenario we might want an RPC for this
    // but for small number of pages, sequential or Promise.all is okay for now.
    const updates = pageIds.map((id, index) =>
        supabase
            .from('pages')
            .update({ sort_order: index })
            .eq('id', id)
            .eq('space_id', spaceId)
    )

    const results = await Promise.all(updates)
    const errors = results.filter(r => r.error)

    if (errors.length > 0) {
        console.error('Errors during reordering:', errors)
        return { error: 'Failed to update some pages' }
    }

    revalidatePath(`/spaces/${spaceId}`)
    return { success: true }
}
