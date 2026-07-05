import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth } from '@/app/lib/firebase-admin'
import { OAUTH_STATE_COOKIE, OAUTH_LINK_UID_COOKIE, OAUTH_PKCE_COOKIE, OAUTH_TOKEN_COOKIE, oauthCookieOptions } from '@/app/lib/oauth'
import { resolveSignInUid, linkOAuthToAccount, type OAuthProfile } from '@/app/lib/oauthLinks'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin

  if (error || !code) {
    return NextResponse.redirect(`${appUrl}/?error=twitter_cancelled`)
  }

  // CSRF check
  const storedState = request.cookies.get(OAUTH_STATE_COOKIE)?.value
  if (!state || state !== storedState) {
    return NextResponse.redirect(`${appUrl}/?error=invalid_state`)
  }

  const codeVerifier = request.cookies.get(OAUTH_PKCE_COOKIE)?.value
  if (!codeVerifier) {
    return NextResponse.redirect(`${appUrl}/?error=invalid_state`)
  }

  const clientId = process.env.TWITTER_OAUTH_CLIENT_ID!
  const clientSecret = process.env.TWITTER_OAUTH_CLIENT_SECRET!
  const redirectUri = `${appUrl}/api/auth/callback/twitter`

  // Exchange code for tokens. X confidential clients authenticate with HTTP Basic
  // and must replay the PKCE code_verifier.
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const tokenRes = await fetch('https://api.twitter.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basic}`,
    },
    body: new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
      client_id: clientId,
    }),
  })

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${appUrl}/?error=token_exchange_failed`)
  }

  const tokens = await tokenRes.json()
  const accessToken = tokens.access_token
  if (!accessToken) {
    return NextResponse.redirect(`${appUrl}/?error=token_exchange_failed`)
  }

  // Get the X profile. `confirmed_email` requires the users.email scope (X added
  // OAuth 2.0 email support in Apr 2025) and is absent when the user has no
  // confirmed email — then we fall back to keying the account by the stable id.
  const userInfoRes = await fetch(
    'https://api.twitter.com/2/users/me?user.fields=profile_image_url,name,username,confirmed_email',
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )

  if (!userInfoRes.ok) {
    return NextResponse.redirect(`${appUrl}/?error=userinfo_failed`)
  }

  const data = (await userInfoRes.json())?.data
  if (!data?.id) {
    return NextResponse.redirect(`${appUrl}/?error=userinfo_failed`)
  }

  const profile: OAuthProfile = {
    provider: 'twitter',
    providerId: String(data.id),
    email: data.confirmed_email || null,
    displayName: data.name || data.username,
    photoURL: data.profile_image_url,
  }

  const clearCookies = (res: NextResponse) => {
    res.cookies.delete(OAUTH_STATE_COOKIE)
    res.cookies.delete(OAUTH_LINK_UID_COOKIE)
    res.cookies.delete(OAUTH_PKCE_COOKIE)
    return res
  }

  // Link mode: the user is already signed in and wants to attach this provider.
  const linkUid = request.cookies.get(OAUTH_LINK_UID_COOKIE)?.value
  if (linkUid) {
    const result = await linkOAuthToAccount(linkUid, profile)
    const dest = result.ok
      ? `${appUrl}/profile?linked=twitter`
      : `${appUrl}/profile?error=${result.error}`
    return clearCookies(NextResponse.redirect(dest))
  }

  // Normal sign-in: resolve the target account (explicit link > email > create).
  const firebaseUid = await resolveSignInUid(profile)
  const customToken = await getAdminAuth().createCustomToken(firebaseUid)

  // Deliver the custom token via a short-lived httpOnly cookie (not the URL, which
  // would leak it into logs/history) and redirect to the callback page to exchange it.
  const response = clearCookies(NextResponse.redirect(`${appUrl}/auth/callback`))
  response.cookies.set(OAUTH_TOKEN_COOKIE, customToken, oauthCookieOptions(120))
  return response
}
