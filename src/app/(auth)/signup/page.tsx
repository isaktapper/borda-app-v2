import { createAdminClient } from '@/lib/supabase/server'
import { SignupForm } from './signup-form'

interface Invitation {
    id: string
    organizationId: string
    organizationName: string
}

export default async function SignupPage({
    searchParams,
}: {
    searchParams: Promise<{ email?: string }>
}) {
    const params = await searchParams
    const invitedEmail = params.email ? decodeURIComponent(params.email) : null
    
    let invitation: Invitation | null = null

    // Check if there's a pending invitation for this email
    // Use admin client since user is not authenticated yet
    if (invitedEmail) {
        const supabase = await createAdminClient()
        
        const { data, error } = await supabase
            .from('organization_members')
            .select('id, organization_id, organizations(name)')
            .eq('invited_email', invitedEmail)
            .is('user_id', null)
            .is('deleted_at', null)
            .single()

        if (error) {
            console.error('Error fetching invitation:', error)
        }

        if (data && data.organizations) {
            const org = data.organizations as unknown as { name: string } | null
            if (org?.name) {
                invitation = {
                    id: data.id,
                    organizationId: data.organization_id,
                    organizationName: org.name,
                }
            }
        }
    }

    return <SignupForm invitation={invitation} invitedEmail={invitedEmail} />
}
