import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth } from '@/app/lib/firebase-admin'
import {
  OAUTH_STATE_COOKIE,
  OAUTH_LINK_UID_COOKIE,
  buildAuthorizeUrl,
  generateOAuthState,
  oauthCookieOptions,
  oauthRedirectUri,
  type OAuthProvider,
} from '@/app/lib/oauth'

// Starts an OAuth "link to my account" flow. The user must be signed in: we verify
// their ID token, then stash the verified uid + CSRF state in short-lived cookies
// and hand back the provider authorization URL for the client to navigate to.
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = authHeader.split('Bearer ')[1]
  let uid: string
  try {
    uid = (await getAdminAuth().verifyIdToken(token)).uid
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as { provider?: string }
  const provider = body.provider as OAuthProvider
  if (provider !== 'google' && provider !== 'github') {
    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin
  const state = generateOAuthState()

  let url: string
  try {
    url = buildAuthorizeUrl(provider, oauthRedirectUri(origin, provider), state)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'OAuth not configured' },
      { status: 500 },
    )
  }

  const response = NextResponse.json({ url })
  response.cookies.set(OAUTH_STATE_COOKIE, state, oauthCookieOptions())
  response.cookies.set(OAUTH_LINK_UID_COOKIE, uid, oauthCookieOptions())
  return response
}
