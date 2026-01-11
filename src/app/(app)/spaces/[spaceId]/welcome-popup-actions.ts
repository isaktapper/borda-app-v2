'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface WelcomePopupContent {
    enabled: boolean
    title: string
    description: string
    imageUrl?: string | null
    videoUrl?: string | null
    ctaText?: string | null
    ctaAction?: 'dismiss' | 'go_to_page' | 'link'
    ctaPageId?: string | null
    ctaLink?: string | null
}

export async function getWelcomePopup(spaceId: string): Promise<WelcomePopupContent | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('spaces')
        .select('welcome_popup')
        .eq('id', spaceId)
        .single()

    if (error) {
        console.error('Error fetching welcome popup:', error)
        return null
    }

    return data?.welcome_popup as WelcomePopupContent | null
}

export async function updateWelcomePopup(
    spaceId: string, 
    content: WelcomePopupContent
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient()

    const { error } = await supabase
        .from('spaces')
        .update({ welcome_popup: content })
        .eq('id', spaceId)

    if (error) {
        console.error('Error updating welcome popup:', error)
        return { success: false, error: error.message }
    }

    revalidatePath(`/spaces/${spaceId}`)
    return { success: true }
}
