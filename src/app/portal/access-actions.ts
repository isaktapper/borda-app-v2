'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { createPortalSession } from '@/lib/portal-auth'
import { randomUUID } from 'crypto'
import { redirect } from 'next/navigation'

export async function validatePortalToken(projectId: string, token: string) {
    const supabase = await createAdminClient()

    // 1. Check project status first
    const { data: project } = await supabase
        .from('projects')
        .select('id, status, client_name')
        .eq('id', projectId)
        .single()

    if (!project) {
        return { error: 'Projektet kunde inte hittas.' }
    }

    // Block access to draft and archived projects
    if (project.status === 'draft') {
        return { error: 'Portalen är inte redo än. Kontakta ditt team för mer information.' }
    }

    if (project.status === 'archived') {
        return { error: 'Detta projekt är avslutat och inte längre tillgängligt.' }
    }

    // 2. Find and validate token
    const { data: tokenRecord, error: fetchError } = await supabase
        .from('portal_access_tokens')
        .select('*')
        .eq('project_id', projectId)
        .eq('token', token)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .single()

    if (fetchError || !tokenRecord) {
        return { error: 'Länken är ogiltig eller har gått ut.' }
    }

    // 2. Mark token as used
    await supabase
        .from('portal_access_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('id', tokenRecord.id)

    // 3. Update project_members joined_at if not set
    await supabase
        .from('project_members')
        .update({ joined_at: new Date().toISOString() })
        .eq('project_id', projectId)
        .eq('invited_email', tokenRecord.email)
        .is('joined_at', null)

    // 4. Create session cookie
    await createPortalSession(projectId, tokenRecord.email)

    // 4. Redirect to portal
    redirect(`/portal/${projectId}`)
}

export async function requestPortalAccess(projectId: string, email: string) {
    const supabase = await createAdminClient()

    // 1. Verify that email is a member of the project
    const { data: member, error: memberError } = await supabase
        .from('project_members')
        .select('id')
        .eq('project_id', projectId)
        .eq('invited_email', email)
        .eq('role', 'customer')
        .limit(1)
        .single()

    if (memberError || !member) {
        // We return success anyway to prevent email enumeration, 
        // but we only send the link if they are actually a member.
        return { success: true, message: 'Om din e-postadress finns i vårt system har vi skickat en länk!' }
    }

    // 2. Generate new token
    const token = randomUUID()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const { error: tokenError } = await supabase
        .from('portal_access_tokens')
        .insert({
            project_id: projectId,
            email,
            token,
            expires_at: expiresAt.toISOString()
        })

    if (tokenError) {
        console.error('Error creating portal token:', tokenError)
        return { error: 'Något gick fel vid generering av länk.' }
    }

    // 3. TODO: Send Email (using Resend or similar email service)
    const accessLink = `${process.env.NEXT_PUBLIC_APP_URL}/portal/${projectId}/access?token=${token}`

    return { success: true, message: 'Vi har skickat en ny åtkomstlänk till din e-post!' }
}
