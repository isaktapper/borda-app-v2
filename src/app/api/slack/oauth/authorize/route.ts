import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  // Verify user is authenticated
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Get user's organization and verify they're admin/owner
  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .single()

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return NextResponse.redirect(
      new URL('/settings?error=unauthorized', request.url)
    )
  }

  // Generate state parameter with organization context
  const state = Buffer.from(
    JSON.stringify({
      organizationId: membership.organization_id,
      userId: user.id,
      timestamp: Date.now()
    })
  ).toString('base64')

  // Build Slack OAuth URL
  const slackAuthUrl = new URL('https://slack.com/oauth/v2/authorize')
  slackAuthUrl.searchParams.set('client_id', process.env.SLACK_CLIENT_ID!)
  slackAuthUrl.searchParams.set('scope', 'chat:write,chat:write.public,channels:read,groups:read,team:read')
  slackAuthUrl.searchParams.set('redirect_uri', process.env.NEXT_PUBLIC_SLACK_REDIRECT_URI!)
  slackAuthUrl.searchParams.set('state', state)

  return NextResponse.redirect(slackAuthUrl.toString())
}
