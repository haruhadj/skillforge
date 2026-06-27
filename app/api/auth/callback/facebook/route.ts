import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth } from '@/app/lib/firebase-admin'
import { OAUTH_STATE_COOKIE, OAUTH_LINK_UID_COOKIE, OAUTH_TOKEN_COOKIE, oauthCookieOptions } from '@/app/lib/oauth'
import { resolveSignInUid, linkOAuthToAccount, type OAuthProfile } from '@/app/lib/oauthLinks'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin

  if (error || !code) {
    return NextResponse.redirect(`${appUrl}/?error=facebook_cancelled`)
  }

  // CSRF check
  const storedState = request.cookies.get('oauth_state')?.value
  if (!state || state !== storedState) {
    return NextResponse.redirect(`${appUrl}/?error=invalid_state`)
  }

  const clientId = process.env.FACEBOOK_OAUTH_CLIENT_ID!
  const clientSecret = process.env.FACEBOOK_OAUTH_CLIENT_SECRET!
  const redirectUri = `${appUrl}/api/auth/callback/facebook`

  // Exchange code for an access token (Facebook uses a GET endpoint with query params).
  const tokenRes = await fetch(
    'https://graph.facebook.com/v19.0/oauth/access_token?' +
      new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code,
      }),
  )

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${appUrl}/?error=token_exchange_failed`)
  }

  const tokens = await tokenRes.json()
  const accessToken = tokens.access_token
  if (!accessToken) {
    return NextResponse.redirect(`${appUrl}/?error=token_exchange_failed`)
  }

  // Get the Facebook profile (email requires the granted "email" permission).
  const userInfoRes = await fetch(
    'https://graph.facebook.com/me?' +
      new URLSearchParams({
        fields: 'id,name,email,picture.width(256).height(256)',
        access_token: accessToken,
      }),
  )

  if (!userInfoRes.ok) {
    return NextResponse.redirect(`${appUrl}/?error=userinfo_failed`)
  }

  const fbUser = await userInfoRes.json()
  const { id: facebookId, name, email } = fbUser
  const picture = fbUser?.picture?.data?.url || undefined

  const profile: OAuthProfile = {
    provider: 'facebook',
    providerId: String(facebookId),
    // Facebook may omit the email (user denied the permission or has none); fall
    // back to null so the account is keyed by provider+providerId like TikTok.
    email: email || null,
    displayName: name,
    photoURL: picture,
  }

  // Link mode: the user is already signed in and wants to attach this provider.
  const linkUid = request.cookies.get(OAUTH_LINK_UID_COOKIE)?.value
  if (linkUid) {
    const result = await linkOAuthToAccount(linkUid, profile)
    const dest = result.ok
      ? `${appUrl}/profile?linked=facebook`
      : `${appUrl}/profile?error=${result.error}`
    const response = NextResponse.redirect(dest)
    response.cookies.delete(OAUTH_STATE_COOKIE)
    response.cookies.delete(OAUTH_LINK_UID_COOKIE)
    return response
  }

  // Normal sign-in: resolve the target account (explicit link > email > create).
  const firebaseUid = await resolveSignInUid(profile)
  const customToken = await getAdminAuth().createCustomToken(firebaseUid)

  // Deliver the custom token via a short-lived httpOnly cookie (not the URL, which
  // would leak it into logs/history) and redirect to the callback page to exchange it.
  const response = NextResponse.redirect(`${appUrl}/auth/callback`)
  response.cookies.set(OAUTH_TOKEN_COOKIE, customToken, oauthCookieOptions(120))
  response.cookies.delete(OAUTH_STATE_COOKIE)
  response.cookies.delete(OAUTH_LINK_UID_COOKIE)
  return response
}
