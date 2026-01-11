'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'
import { sendEmail } from '@/lib/email'
import { customerInviteTemplate } from '@/lib/email/templates'

export async function inviteCustomer(spaceId: string, email: string) {
    try {
        const supabase = await createClient()
        const adminSupabase = await createAdminClient()

        // 1. Get current user (CS)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { error: 'Not authenticated' }

        // 2. Create project member record (pending customer)
        const { error: memberError } = await supabase
            .from('space_members')
            .insert({
                space_id: spaceId,
                invited_email: email,
                role: 'customer',
                invited_by: user.id,
                invited_at: new Date().toISOString()
            })

        if (memberError) {
            if (memberError.code === '23505') return { error: 'An invitation to this email already exists.' }
            return { error: memberError.message }
        }

        // 3. Create portal access token
        const token = randomUUID()
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 7) // 7 days

        const { error: tokenError } = await adminSupabase
            .from('portal_access_tokens')
            .insert({
                space_id: spaceId,
                email,
                token,
                expires_at: expiresAt.toISOString()
            })

        if (tokenError) {
            // Rollback member creation if token fails?
            // Better to just report and let them try again or resend.
            console.error('Portal token error:', tokenError)
            return { error: 'Could not create access link: ' + tokenError.message }
        }

        // 4. Get project info and auto-activate if in draft
        const { data: project } = await supabase
            .from('spaces')
            .select('id, name, client_name, status')
            .eq('id', spaceId)
            .single()

        // Auto-transition from draft to active when first customer is invited
        if (project?.status === 'draft') {
            const { updateSpaceStatus } = await import('./status-actions')
            await updateSpaceStatus(spaceId, 'active')
        }

        // 5. Get project info for email (refresh to get updated status if changed)

        // 5. Send Email
        const accessLink = `${process.env.NEXT_PUBLIC_APP_URL}/space/${spaceId}/access?token=${token}`

        await sendEmail({
            to: email,
            subject: `You have access to ${project?.name || 'your project'}`,
            html: customerInviteTemplate({
                projectName: project?.name || 'your project',
                clientName: project?.client_name || email,
                accessLink
            }),
            type: 'customer_invite',
            metadata: { spaceId, email }
        })

        revalidatePath(`/dashboard/spaces/${spaceId}`)
        return { success: true }
    } catch (err: any) {
        console.error('Invite error:', err)
        return { error: 'An unexpected error occurred.' }
    }
}

export async function getProjectMembers(spaceId: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('space_members')
        .select(`
            *,
            user:profiles(full_name, avatar_url, email)
        `)
        .eq('space_id', spaceId)
        .order('created_at', { ascending: false })

    if (error) return { error: error.message }
    return { data }
}

export async function cancelInvite(memberId: string, spaceId: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('space_members')
        .delete()
        .eq('id', memberId)

    if (error) return { error: error.message }

    revalidatePath(`/dashboard/spaces/${spaceId}`)
    return { success: true }
}

export async function resendInvite(memberId: string, spaceId: string) {
    try {
        const adminSupabase = await createAdminClient()

        // 1. Get member info
        const { data: member, error: fetchError } = await adminSupabase
            .from('space_members')
            .select('*')
            .eq('id', memberId)
            .single()

        if (fetchError || !member) return { error: 'Kunde inte hitta inbjudan.' }

        // 2. Generate new token
        const token = randomUUID()
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 7)

        const { error: tokenError } = await adminSupabase
            .from('portal_access_tokens')
            .insert({
                space_id: spaceId,
                email: member.invited_email,
                token,
                expires_at: expiresAt.toISOString()
            })

        if (tokenError) return { error: tokenError.message }

        // 3. Get project info for email
        const { data: project } = await adminSupabase
            .from('spaces')
            .select('name, client_name')
            .eq('id', spaceId)
            .single()

        // 4. Send email
        const accessLink = `${process.env.NEXT_PUBLIC_APP_URL}/space/${spaceId}/access?token=${token}`

        await sendEmail({
            to: member.invited_email,
            subject: `You have access to ${project?.name || 'your project'}`,
            html: customerInviteTemplate({
                projectName: project?.name || 'your project',
                clientName: project?.client_name || member.invited_email,
                accessLink
            }),
            type: 'customer_invite_resend',
            metadata: { spaceId, email: member.invited_email }
        })

        return { success: true }
    } catch (err: any) {
        return { error: 'Could not resend the link.' }
    }
}
