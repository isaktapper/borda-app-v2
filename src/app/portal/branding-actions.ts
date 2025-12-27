'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { getBranding } from '@/lib/branding'

/**
 * Get resolved branding for a project (with organization fallback)
 * Used in portal to display correct logo and brand color
 */
export async function getPortalBranding(projectId: string) {
    try {
        const supabase = await createAdminClient()

        // Fetch project with organization branding
        const { data: project, error } = await supabase
            .from('projects')
            .select(`
                brand_color,
                logo_path,
                organization_id,
                organizations (
                    brand_color,
                    logo_path
                )
            `)
            .eq('id', projectId)
            .single()

        if (error || !project) {
            console.error('Failed to fetch project branding:', error)
            return {
                color: '#bef264', // default lime
                logoUrl: null
            }
        }

        // Resolve branding with fallback hierarchy
        const organization = Array.isArray(project.organizations)
            ? project.organizations[0]
            : project.organizations

        return await getBranding(
            {
                brand_color: project.brand_color,
                logo_path: project.logo_path
            },
            {
                brand_color: organization?.brand_color,
                logo_path: organization?.logo_path
            }
        )
    } catch (error) {
        console.error('Get portal branding failed:', error)
        return {
            color: '#bef264', // default lime
            logoUrl: null
        }
    }
}
