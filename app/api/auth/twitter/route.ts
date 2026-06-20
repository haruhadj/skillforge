import { NextResponse } from 'next/server'
import {
  OAUTH_STATE_COOKIE,
  OAUTH_LINK_UID_COOKIE,
  OAUTH_PKCE_COOKIE,
  buildAuthorizeUrl,
  generateOAuthState,
  generatePkce,
  oauthCookieOptions,
  oauthRedirectUri,
} from '@/app/lib/oauth'

export async function GET(request: Request) {
  const state = generateOAuthState()
  // Derive the app origin from the incoming request so localhost and prod both work
  // even if NEXT_PUBLIC_APP_URL is not set.
  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin
  // X (Twitter) OAuth 2.0 mandates PKCE; stash the verifier to replay at token exchange.
  const { verifier, challenge } = generatePkce()

  let url: string
  try {
    url = buildAuthorizeUrl('twitter', oauthRedirectUri(origin, 'twitter'), state, challenge)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Twitter OAuth not configured' },
      { status: 500 },
    )
  }

  const response = NextResponse.redirect(url)

  // Store state in a short-lived cookie for CSRF protection
  response.cookies.set(OAUTH_STATE_COOKIE, state, oauthCookieOptions())
  response.cookies.set(OAUTH_PKCE_COOKIE, verifier, oauthCookieOptions())
  // A fresh sign-in must never be treated as a link, so clear any stale link intent
  // left over from an abandoned account-linking flow.
  response.cookies.delete(OAUTH_LINK_UID_COOKIE)

  return response
}
