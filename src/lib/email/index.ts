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
  from?: string      // Override default from address
  replyTo?: string   // Reply-to address
  type?: string
  metadata?: Record<string, any>
}

export async function sendEmail({
  to,
  subject,
  html,
  from,
  replyTo,
  type = 'general',
  metadata = {}
}: SendEmailParams) {
  const defaultFrom = process.env.EMAIL_FROM || 'Borda <help@borda.work>'
  const senderFrom = from || defaultFrom

  // In development: log instead of sending (unless SEND_EMAILS_IN_DEV is set)
  const skipSendInDev = process.env.NODE_ENV === 'development' && !process.env.SEND_EMAILS_IN_DEV
  
  if (skipSendInDev) {
    console.log('📧 Email (dev mode - not sent):', { to, subject, from: senderFrom, replyTo, type })
    console.log('HTML Preview:', html)

    // Still log to database in development
    await logEmail(to, subject, type, metadata)
    return { success: true }
  }

  try {
    const resend = getResendClient()
    const result = await resend.emails.send({
      from: senderFrom,
      to,
      subject,
      html,
      ...(replyTo && { replyTo })
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
