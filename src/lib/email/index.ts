import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'

function getResendClient() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not set')
  }
  return new Resend(process.env.RESEND_API_KEY)
}

interface SendEmailParams {
  to: string
  subject: string
  html: string
  type?: string
  metadata?: Record<string, any>
}

export async function sendEmail({
  to,
  subject,
  html,
  type = 'general',
  metadata = {}
}: SendEmailParams) {
  // In development: log instead of sending
  if (process.env.NODE_ENV === 'development') {
    console.log('📧 Email:', { to, subject, type })
    console.log('HTML Preview:', html)

    // Still log to database in development
    await logEmail(to, subject, type, metadata)
    return { success: true }
  }

  try {
    const resend = getResendClient()
    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Impel <noreply@impel.se>',
      to,
      subject,
      html
    })

    // Log to database
    await logEmail(to, subject, type, metadata)

    return { success: true, data: result }
  } catch (error) {
    console.error('Error sending email:', error)
    return { success: false, error }
  }
}

async function logEmail(
  to: string,
  subject: string,
  type: string,
  metadata: Record<string, any>
) {
  try {
    const supabase = await createClient()
    await supabase
      .from('email_log')
      .insert({
        to_email: to,
        subject,
        type,
        metadata
      })
  } catch (error) {
    console.error('Error logging email:', error)
  }
}
