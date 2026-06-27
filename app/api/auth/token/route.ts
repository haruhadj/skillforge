import { NextRequest, NextResponse } from 'next/server'
import { OAUTH_TOKEN_COOKIE } from '@/app/lib/oauth'

// Single-use exchange endpoint for the OAuth flow. The provider callbacks deliver
// the minted Firebase custom token in the httpOnly `oauth_token` cookie (never the
// URL). The /auth/callback page calls this once to read the token into memory and
// hand it to signInWithCustomToken; the cookie is cleared on the way out so it can
// never be replayed and never lands in logs/history.
export async function GET(request: NextRequest) {
  const token = request.cookies.get(OAUTH_TOKEN_COOKIE)?.value

  const headers = { 'Cache-Control': 'no-store' }

  if (!token) {
    return NextResponse.json({ error: 'no_token' }, { status: 401, headers })
  }

  const response = NextResponse.json({ token }, { headers })
  // Read-and-clear: invalidate immediately so the token is single-use.
  response.cookies.delete(OAUTH_TOKEN_COOKIE)
  return response
}
