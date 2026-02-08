'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { slugify } from '@/lib/sluggify'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createCustomerWithTrial } from '@/lib/stripe/subscription'

export async function createOrganizationWithOnboarding(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const name = formData.get('name') as string
    if (!name) {
        return { error: 'Organization name is required' }
    }

    const domain = formData.get('domain') as string | null
    const joinPolicy = formData.get('joinPolicy') as 'invite_only' | 'domain_auto_join' | null
    const brandColor = formData.get('brandColor') as string | null
    const industry = formData.get('industry') as string | null
    const companySize = formData.get('companySize') as string | null
    const referralSource = formData.get('referralSource') as string | null
    const referralSourceOther = formData.get('referralSourceOther') as string | null
    const logoFile = formData.get('logo') as File | null

    let slug = slugify(name)

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

    // Handle logo upload if provided
    let logoPath: string | null = null
    if (logoFile && logoFile.size > 0) {
        const adminClient = await createAdminClient()
        const fileExt = logoFile.name.split('.').pop()?.toLowerCase() || 'png'
        const fileName = `${slug}/logo.${fileExt}`
        
        const { error: uploadError } = await adminClient.storage
            .from('branding')
            .upload(fileName, logoFile, {
                upsert: true,
                contentType: logoFile.type
            })

        if (uploadError) {
            console.error('Logo upload error:', uploadError)
            // Continue without logo if upload fails
        } else {
            logoPath = fileName
        }
    }

    // Use RPC for atomic creation with all onboarding fields
    const { data: orgData, error: rpcError } = await supabase.rpc('create_organization_rpc', {
        p_name: name,
        p_slug: slug,
        p_domain: domain || null,
        p_industry: industry || null,
        p_company_size: companySize || null,
        p_referral_source: referralSource || null,
        p_referral_source_other: referralSourceOther || null,
        p_brand_color: brandColor || null,
        p_logo_path: logoPath
    })

    if (rpcError) {
        return { error: rpcError.message }
    }

    // Update join_policy if provided (RPC doesn't support it directly)
    if (orgData?.id && joinPolicy) {
        await supabase
            .from('organizations')
            .update({ join_policy: joinPolicy })
            .eq('id', orgData.id)
    }

    // Create Stripe customer with 14-day trial
    if (orgData?.id) {
        const { error: stripeError } = await createCustomerWithTrial({
            organizationId: orgData.id,
            organizationName: name,
            email: user.email!,
        })

        if (stripeError) {
            console.error('Failed to create Stripe customer:', stripeError)
            // Continue anyway - billing can be set up later
        }
    }

    // Create demo space for new organization
    if (orgData?.id) {
        const { createDemoSpace } = await import('@/lib/demo-space')
        await createDemoSpace(orgData.id, user.id)
    }

    revalidatePath('/', 'layout')
    redirect('/spaces')
}

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
    const { data: orgData, error: rpcError } = await supabase.rpc('create_organization_rpc', {
        p_name: name,
        p_slug: slug,
        p_domain: domain || null
    })

    if (rpcError) {
        return { error: rpcError.message }
    }

    // Create Stripe customer with 14-day trial
    if (orgData?.id) {
        const { error: stripeError } = await createCustomerWithTrial({
            organizationId: orgData.id,
            organizationName: name,
            email: user.email!,
        })
        
        if (stripeError) {
            console.error('Failed to create Stripe customer:', stripeError)
            // Continue anyway - billing can be set up later
        }
    }

    revalidatePath('/', 'layout')
    redirect('/spaces')
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
    redirect('/spaces')
}

interface RequestAccessParams {
    email: string
    name: string | null
    organizationId: string
}

export async function requestAccessToOrganization({
    email,
    name,
    organizationId
}: RequestAccessParams): Promise<{ success?: boolean; error?: string }> {
    const adminClient = await createAdminClient()

    // Check if there's already a pending request
    const { data: existingRequest } = await adminClient
        .from('access_requests')
        .select('id')
        .eq('email', email)
        .eq('organization_id', organizationId)
        .eq('status', 'pending')
        .single()

    if (existingRequest) {
        return { error: 'You have already requested access to this organization' }
    }

    // Check if user is already invited
    const { data: existingInvite } = await adminClient
        .from('organization_members')
        .select('id')
        .eq('invited_email', email)
        .eq('organization_id', organizationId)
        .is('deleted_at', null)
        .single()

    if (existingInvite) {
        return { error: 'You have already been invited to this organization' }
    }

    // Get organization name for email
    const { data: org } = await adminClient
        .from('organizations')
        .select('name')
        .eq('id', organizationId)
        .single()

    // Create the access request
    const { error: insertError } = await adminClient
        .from('access_requests')
        .insert({
            email,
            name,
            organization_id: organizationId,
            status: 'pending'
        })

    if (insertError) {
        console.error('Error creating access request:', insertError)
        return { error: 'Failed to submit request. Please try again.' }
    }

    // Get admins to notify
    const { data: admins } = await adminClient
        .from('organization_members')
        .select('invited_email')
        .eq('organization_id', organizationId)
        .in('role', ['owner', 'admin'])
        .is('deleted_at', null)

    // Import sendEmail dynamically to avoid circular deps
    const { sendAccessRequestNotificationEmail } = await import('@/lib/email')

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.borda.work'
    const settingsUrl = `${appUrl}/settings?tab=organization`

    // Send notification emails to all admins/owners
    if (admins && org) {
        for (const admin of admins) {
            await sendAccessRequestNotificationEmail({
                to: admin.invited_email,
                organizationId,
                organizationName: org.name,
                requesterEmail: email,
                requesterName: name,
                requestId: '',
                approveLink: settingsUrl,
                denyLink: settingsUrl,
            })
        }
    }

    return { success: true }
}
