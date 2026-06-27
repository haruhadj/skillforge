import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth } from '@/app/lib/firebase-admin'
import { OAUTH_STATE_COOKIE, OAUTH_LINK_UID_COOKIE } from '@/app/lib/oauth'
import { resolveSignInUid, linkOAuthToAccount, type OAuthProfile } from '@/app/lib/oauthLinks'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin

  if (error || !code) {
    return NextResponse.redirect(`${appUrl}/?error=google_cancelled`)
  }

  // CSRF check
  const storedState = request.cookies.get('oauth_state')?.value
  if (!state || state !== storedState) {
    return NextResponse.redirect(`${appUrl}/?error=invalid_state`)
  }

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID!
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET!
  const redirectUri = `${appUrl}/api/auth/callback/google`

  // Exchange code for tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${appUrl}/?error=token_exchange_failed`)
  }

  const tokens = await tokenRes.json()

  // Get user info from Google
  const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })

  if (!userInfoRes.ok) {
    return NextResponse.redirect(`${appUrl}/?error=userinfo_failed`)
  }

  const googleUser = await userInfoRes.json()
  const { email, verified_email, name, picture, id: googleId } = googleUser

  if (!email) {
    return NextResponse.redirect(`${appUrl}/?error=google_no_email`)
  }

  const profile: OAuthProfile = {
    provider: 'google',
    providerId: String(googleId),
    // Only trust the email for account unification when Google says it is
    // verified. An unverified address must NOT be allowed to unify onto — and
    // thereby take over — an existing account, so fall back to keying by the
    // provider id (null email), exactly like the no-email providers.
    email: verified_email === true ? email : null,
    displayName: name,
    photoURL: picture,
  }

  // Link mode: the user is already signed in and wants to attach this provider.
  const linkUid = request.cookies.get(OAUTH_LINK_UID_COOKIE)?.value
  if (linkUid) {
    const result = await linkOAuthToAccount(linkUid, profile)
    const dest = result.ok
      ? `${appUrl}/profile?linked=google`
      : `${appUrl}/profile?error=${result.error}`
    const response = NextResponse.redirect(dest)
    response.cookies.delete(OAUTH_STATE_COOKIE)
    response.cookies.delete(OAUTH_LINK_UID_COOKIE)
    return response
  }

  // Normal sign-in: resolve the target account (explicit link > email > create).
  const firebaseUid = await resolveSignInUid(profile)
  const customToken = await getAdminAuth().createCustomToken(firebaseUid)

  // Clear the CSRF cookie and redirect the client to finish sign-in
  const response = NextResponse.redirect(
    `${appUrl}/auth/callback?token=${encodeURIComponent(customToken)}`
  )
  response.cookies.delete(OAUTH_STATE_COOKIE)
  response.cookies.delete(OAUTH_LINK_UID_COOKIE)
  return response
}
