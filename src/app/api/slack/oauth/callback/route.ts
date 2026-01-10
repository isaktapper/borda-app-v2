import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { encryptToken } from '@/lib/slack/encryption'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // Handle user cancellation
  if (error === 'access_denied') {
    return NextResponse.redirect(
      new URL('/settings?tab=integrations&error=cancelled', request.url)
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/settings?tab=integrations&error=invalid', request.url)
    )
  }

  try {
    // Decode state to get organization context
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'))
    const { organizationId, userId, timestamp } = stateData

    // Verify state timestamp (prevent replay attacks)
    if (Date.now() - timestamp > 10 * 60 * 1000) { // 10 minutes
      throw new Error('OAuth state expired')
    }

    // Verify user authentication
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || user.id !== userId) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: process.env.SLACK_CLIENT_ID!,
        client_secret: process.env.SLACK_CLIENT_SECRET!,
        code,
        redirect_uri: process.env.NEXT_PUBLIC_SLACK_REDIRECT_URI!
      })
    })

    const tokenData = await tokenResponse.json()

    if (!tokenData.ok) {
      console.error('Slack OAuth error:', tokenData)
      throw new Error(tokenData.error || 'OAuth exchange failed')
    }

    // Encrypt token
    const encryptedToken = encryptToken(tokenData.access_token)

    // Store integration using admin client (bypasses RLS for insert)
    const adminSupabase = await createAdminClient()

    const { error: insertError } = await adminSupabase
      .from('slack_integrations')
      .upsert({
        organization_id: organizationId,
        access_token: encryptedToken,
        bot_user_id: tokenData.bot_user_id,
        team_id: tokenData.team.id,
        team_name: tokenData.team.name,
        scope: tokenData.scope,
        enabled_events: ['task.completed', 'form.answered', 'file.uploaded', 'portal.first_visit', 'space.status_changed'],
        enabled: true,
        installed_by_user_id: userId
      }, {
        onConflict: 'organization_id'
      })

    if (insertError) {
      console.error('Failed to store integration:', insertError)
      throw insertError
    }

    // Success - redirect to settings with success message
    return NextResponse.redirect(
      new URL('/settings?tab=integrations&success=connected', request.url)
    )

  } catch (error) {
    console.error('OAuth callback error:', error)
    return NextResponse.redirect(
      new URL('/settings?tab=integrations&error=failed', request.url)
    )
  }
}
