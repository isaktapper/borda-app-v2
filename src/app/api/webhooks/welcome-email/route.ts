import { NextRequest, NextResponse } from 'next/server'
import { sendWelcomeEmail } from '@/lib/email'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * Webhook endpoint for sending welcome emails after user verification.
 * Can be called by:
 * 1. Supabase Database Webhook when email_confirmed_at is set
 * 2. Supabase Auth Hook
 * 
 * Expected payload:
 * {
 *   type: 'INSERT' | 'UPDATE',
 *   record: {
 *     id: string,
 *     email: string,
 *     raw_user_meta_data: { full_name?: string },
 *     email_confirmed_at: string | null
 *   },
 *   old_record?: {
 *     email_confirmed_at: string | null
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret
    const authHeader = request.headers.get('authorization')
    const webhookSecret = process.env.WEBHOOK_SECRET

    if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await request.json()
    
    // Handle Supabase database webhook format
    const { type, record, old_record } = payload

    // Only process if email was just confirmed (changed from null to a value)
    const wasUnconfirmed = !old_record?.email_confirmed_at
    const isNowConfirmed = !!record?.email_confirmed_at

    if (type === 'UPDATE' && wasUnconfirmed && isNowConfirmed) {
      const userId = record.id
      const email = record.email
      const fullName = record.raw_user_meta_data?.full_name || ''
      const firstName = fullName.split(' ')[0] || 'there'

      // Check if welcome email was already sent (prevent duplicates)
      const supabase = await createAdminClient()
      const { data: user } = await supabase
        .from('users')
        .select('welcome_email_sent_at')
        .eq('id', userId)
        .single()

      if (user?.welcome_email_sent_at) {
        return NextResponse.json({ 
          success: true, 
          message: 'Welcome email already sent',
          email 
        })
      }

      // Send welcome email
      const result = await sendWelcomeEmail({
        to: email,
        firstName,
        userId,
      })

      if (result.success) {
        // Mark welcome email as sent
        await supabase
          .from('users')
          .update({ welcome_email_sent_at: new Date().toISOString() })
          .eq('id', userId)
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Welcome email sent',
        email 
      })
    }

    // Not a verification event, skip
    return NextResponse.json({ 
      success: true, 
      message: 'Skipped - not a verification event' 
    })

  } catch (error) {
    console.error('Welcome email webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
