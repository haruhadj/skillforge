import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth } from '@/app/lib/firebase-admin'
import { OAUTH_STATE_COOKIE, OAUTH_LINK_UID_COOKIE, OAUTH_TOKEN_COOKIE, oauthCookieOptions } from '@/app/lib/oauth'
import { resolveSignInUid, linkOAuthToAccount, type OAuthProfile } from '@/app/lib/oauthLinks'

// GitHub requires a User-Agent header on every API request.
const GITHUB_HEADERS = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'SkillForge',
}

interface GitHubEmail {
  email: string
  primary: boolean
  verified: boolean
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin

  if (error || !code) {
    return NextResponse.redirect(`${appUrl}/?error=github_cancelled`)
  }

  // CSRF check
  const storedState = request.cookies.get('oauth_state')?.value
  if (!state || state !== storedState) {
    return NextResponse.redirect(`${appUrl}/?error=invalid_state`)
  }

  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID!
  const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET!
  const redirectUri = `${appUrl}/api/auth/callback/github`

  // Exchange code for an access token (Accept: json so we get JSON, not a query string)
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
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

  // Get the GitHub profile
  const userInfoRes = await fetch('https://api.github.com/user', {
    headers: { ...GITHUB_HEADERS, Authorization: `Bearer ${accessToken}` },
  })

  if (!userInfoRes.ok) {
    return NextResponse.redirect(`${appUrl}/?error=userinfo_failed`)
  }

  const githubUser = await userInfoRes.json()
  const { id: githubId, login, name, avatar_url: picture } = githubUser

  // The /user endpoint omits the email when the user keeps it private, so fetch
  // the verified primary email from the dedicated endpoint (needs user:email scope).
  let email: string | null = githubUser.email || null
  if (!email) {
    const emailRes = await fetch('https://api.github.com/user/emails', {
      headers: { ...GITHUB_HEADERS, Authorization: `Bearer ${accessToken}` },
    })
    if (emailRes.ok) {
      const emails: GitHubEmail[] = await emailRes.json()
      const primary = emails.find((e) => e.primary && e.verified)
      email = primary?.email || emails.find((e) => e.verified)?.email || null
    }
  }

  if (!email) {
    return NextResponse.redirect(`${appUrl}/?error=github_no_email`)
  }

  const profile: OAuthProfile = {
    provider: 'github',
    providerId: String(githubId),
    email,
    displayName: name || login,
    photoURL: picture,
  }

  // Link mode: the user is already signed in and wants to attach this provider.
  const linkUid = request.cookies.get(OAUTH_LINK_UID_COOKIE)?.value
  if (linkUid) {
    const result = await linkOAuthToAccount(linkUid, profile)
    const dest = result.ok
      ? `${appUrl}/profile?linked=github`
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
