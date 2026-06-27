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
    return NextResponse.redirect(`${appUrl}/?error=tiktok_cancelled`)
  }

  // CSRF check
  const storedState = request.cookies.get(OAUTH_STATE_COOKIE)?.value
  if (!state || state !== storedState) {
    return NextResponse.redirect(`${appUrl}/?error=invalid_state`)
  }

  const clientKey = process.env.TIKTOK_OAUTH_CLIENT_KEY!
  const clientSecret = process.env.TIKTOK_OAUTH_CLIENT_SECRET!
  const redirectUri = `${appUrl}/api/auth/callback/tiktok`

  // Exchange the authorization code for an access token (TikTok uses client_key).
  const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
  })

  const tokens = await tokenRes.json().catch(() => ({}))
  const accessToken = tokens.access_token
  if (!tokenRes.ok || !accessToken) {
    return NextResponse.redirect(`${appUrl}/?error=token_exchange_failed`)
  }

  // Fetch the TikTok profile. TikTok never returns an email, so the account is
  // keyed solely by the stable open_id.
  const userInfoRes = await fetch(
    'https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name',
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )

  const userInfo = await userInfoRes.json().catch(() => ({}))
  const tiktokUser = userInfo?.data?.user
  if (!userInfoRes.ok || !tiktokUser?.open_id) {
    return NextResponse.redirect(`${appUrl}/?error=userinfo_failed`)
  }

  const profile: OAuthProfile = {
    provider: 'tiktok',
    providerId: String(tiktokUser.open_id),
    email: null,
    displayName: tiktokUser.display_name || undefined,
    photoURL: tiktokUser.avatar_url || undefined,
  }

  // Link mode: the user is already signed in and wants to attach TikTok.
  const linkUid = request.cookies.get(OAUTH_LINK_UID_COOKIE)?.value
  if (linkUid) {
    const result = await linkOAuthToAccount(linkUid, profile)
    const dest = result.ok
      ? `${appUrl}/profile?linked=tiktok`
      : `${appUrl}/profile?error=${result.error}`
    const response = NextResponse.redirect(dest)
    response.cookies.delete(OAUTH_STATE_COOKIE)
    response.cookies.delete(OAUTH_LINK_UID_COOKIE)
    return response
  }

  // Normal sign-in: resolve the target account (explicit link > native open_id).
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
