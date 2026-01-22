'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'

async function emailExists(email: string): Promise<boolean> {
    const adminClient = await createAdminClient()

    // Query auth.users directly using raw SQL via RPC
    const { data } = await adminClient.rpc('check_email_exists', {
        p_email: email.toLowerCase()
    })

    return !!data
}

export async function login(formData: FormData) {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !password) {
        return { error: 'Please enter both email and password.' }
    }

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/', 'layout')
    redirect('/spaces')
}

export async function signup(formData: FormData) {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const fullName = formData.get('fullName') as string

    if (!email || !password || !fullName) {
        return { error: 'Please fill in all fields.' }
    }

    if (password.length < 8) {
        return { error: 'Password must be at least 8 characters.' }
    }

    // Check if email already exists
    if (await emailExists(email)) {
        return { error: 'An account with this email already exists. Please sign in instead.' }
    }

    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName,
            },
            emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
        },
    })

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/', 'layout')
    redirect('/verify')
}

export async function signupWithInvitation(formData: FormData) {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const fullName = formData.get('fullName') as string
    const invitationId = formData.get('invitationId') as string
    const organizationId = formData.get('organizationId') as string

    if (!email || !password || !fullName) {
        return { error: 'Please fill in all fields.' }
    }

    if (!invitationId || !organizationId) {
        return { error: 'Invalid invitation.' }
    }

    if (password.length < 8) {
        return { error: 'Password must be at least 8 characters.' }
    }

    // Check if email already exists
    if (await emailExists(email)) {
        return { error: 'An account with this email already exists. Please sign in instead.' }
    }

    // Create user with invitation metadata
    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName,
                pending_invitation_id: invitationId,
                pending_organization_id: organizationId,
            },
            emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
        },
    })

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/', 'layout')
    redirect('/verify')
}

export async function signout() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
    redirect('/login')
}

export async function signInWithGoogle() {
    const supabase = await createClient()

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
            queryParams: {
                access_type: 'offline',
                prompt: 'consent',
            },
        },
    })

    if (error) {
        return { error: error.message }
    }

    if (data.url) {
        redirect(data.url)
    }

    return { error: 'Failed to get OAuth URL' }
}
