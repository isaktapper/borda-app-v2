import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import crypto from 'crypto'

function verifySlackRequest(request: NextRequest, body: string): boolean {
  const timestamp = request.headers.get('x-slack-request-timestamp')
  const signature = request.headers.get('x-slack-signature')

  if (!timestamp || !signature) return false

  // Prevent replay attacks
  const time = Math.floor(Date.now() / 1000)
  if (Math.abs(time - parseInt(timestamp)) > 60 * 5) {
    return false
  }

  const sigBasestring = `v0:${timestamp}:${body}`
  const mySignature = 'v0=' + crypto
    .createHmac('sha256', process.env.SLACK_SIGNING_SECRET!)
    .update(sigBasestring)
    .digest('hex')

  return crypto.timingSafeEqual(
    Buffer.from(mySignature),
    Buffer.from(signature)
  )
}

export async function POST(request: NextRequest) {
  const body = await request.text()

  // Verify request is from Slack
  if (!verifySlackRequest(request, body)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const payload = JSON.parse(body)

  // Handle URL verification challenge
  if (payload.type === 'url_verification') {
    return NextResponse.json({ challenge: payload.challenge })
  }

  // Handle events
  if (payload.type === 'event_callback') {
    const event = payload.event

    switch (event.type) {
      case 'app_uninstalled':
        await handleAppUninstalled(payload.team_id)
        break

      case 'channel_deleted':
        await handleChannelDeleted(event.channel)
        break
    }
  }

  return NextResponse.json({ ok: true })
}

async function handleAppUninstalled(teamId: string) {
  const supabase = await createAdminClient()

  // Soft delete integration
  await supabase
    .from('slack_integrations')
    .update({
      enabled: false,
      deleted_at: new Date().toISOString()
    })
    .eq('team_id', teamId)
}

async function handleChannelDeleted(channelId: string) {
  const supabase = await createAdminClient()

  // Clear notification channel if it was deleted
  await supabase
    .from('slack_integrations')
    .update({
      notification_channel_id: null,
      notification_channel_name: null
    })
    .eq('notification_channel_id', channelId)
}
