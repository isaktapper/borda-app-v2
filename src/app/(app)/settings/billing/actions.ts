'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function redirectToCheckout(formData: FormData) {
  const plan = formData.get('plan') as string
  const interval = formData.get('interval') as string
  const organizationId = formData.get('organizationId') as string

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Call our API endpoint
  const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/create-checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      plan,
      interval,
      organizationId,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    return { error: error.message || 'Failed to create checkout session' }
  }

  const { url } = await response.json()
  
  if (url) {
    redirect(url)
  }

  return { error: 'No checkout URL returned' }
}

export async function redirectToPortal(formData: FormData) {
  const organizationId = formData.get('organizationId') as string

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Call our API endpoint
  const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/create-portal`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      organizationId,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    return { error: error.message || 'Failed to create portal session' }
  }

  const { url } = await response.json()
  
  if (url) {
    redirect(url)
  }

  return { error: 'No portal URL returned' }
}
