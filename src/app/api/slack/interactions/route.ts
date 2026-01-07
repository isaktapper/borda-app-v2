import { NextRequest, NextResponse } from 'next/server'
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

  // Handle different interaction types
  switch (payload.type) {
    case 'block_actions':
      // Future: Handle button clicks in messages
      return NextResponse.json({ ok: true })

    case 'view_submission':
      // Future: Handle modal form submissions
      return NextResponse.json({ ok: true })

    default:
      return NextResponse.json({ ok: true })
  }
}
