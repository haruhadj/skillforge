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
    return NextResponse.redirect(`${appUrl}/?error=discord_cancelled`)
  }

  // CSRF check
  const storedState = request.cookies.get(OAUTH_STATE_COOKIE)?.value
  if (!state || state !== storedState) {
    return NextResponse.redirect(`${appUrl}/?error=invalid_state`)
  }

  const clientId = process.env.DISCORD_OAUTH_CLIENT_ID!
  const clientSecret = process.env.DISCORD_OAUTH_CLIENT_SECRET!
  const redirectUri = `${appUrl}/api/auth/callback/discord`

  // Exchange the authorization code for an access token.
  const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
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

  // Fetch the Discord profile (id, username, global_name, email, avatar hash).
  const userInfoRes = await fetch('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  const discordUser = await userInfoRes.json().catch(() => ({}))
  if (!userInfoRes.ok || !discordUser?.id) {
    return NextResponse.redirect(`${appUrl}/?error=userinfo_failed`)
  }

  // Discord only returns an email when the `email` scope is granted and the account
  // has a verified email. Require it so the account can unify by email like the
  // other email-providing providers.
  const email: string | null = discordUser.verified && discordUser.email ? discordUser.email : null
  if (!email) {
    return NextResponse.redirect(`${appUrl}/?error=discord_no_email`)
  }

  // Avatars are served from the CDN keyed by user id + avatar hash; null when the
  // user has only the default avatar.
  const photoURL = discordUser.avatar
    ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
    : undefined

  const profile: OAuthProfile = {
    provider: 'discord',
    providerId: String(discordUser.id),
    email,
    displayName: discordUser.global_name || discordUser.username || undefined,
    photoURL,
  }

  // Link mode: the user is already signed in and wants to attach Discord.
  const linkUid = request.cookies.get(OAUTH_LINK_UID_COOKIE)?.value
  if (linkUid) {
    const result = await linkOAuthToAccount(linkUid, profile)
    const dest = result.ok
      ? `${appUrl}/profile?linked=discord`
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
