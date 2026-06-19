import { NextResponse } from 'next/server'
import crypto from 'crypto'

export async function GET(request: Request) {
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID
  if (!clientId) {
    return NextResponse.json({ error: 'GitHub OAuth not configured' }, { status: 500 })
  }

  const state = crypto.randomBytes(16).toString('hex')
  // Derive the app origin from the incoming request so localhost and prod both work
  // even if NEXT_PUBLIC_APP_URL is not set.
  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin
  const redirectUri = `${origin}/api/auth/callback/github`

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'read:user user:email',
    state,
    allow_signup: 'true',
  })

  const response = NextResponse.redirect(
    `https://github.com/login/oauth/authorize?${params}`
  )

  // Store state in a short-lived cookie for CSRF protection
  response.cookies.set('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 minutes
    path: '/',
  })

  return response
}
