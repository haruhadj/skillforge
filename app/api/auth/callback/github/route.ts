import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth } from '@/app/lib/firebase-admin'

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

  // Look up or create the Firebase user
  const adminAuth = getAdminAuth()
  let firebaseUid: string
  const displayName = name || login

  try {
    const existing = await adminAuth.getUserByEmail(email)
    firebaseUid = existing.uid
    // Keep displayName/photoURL up to date
    if (!existing.displayName || !existing.photoURL) {
      await adminAuth.updateUser(firebaseUid, {
        displayName: existing.displayName || displayName,
        photoURL: existing.photoURL || picture,
      })
    }
  } catch {
    // User doesn't exist — create them
    const created = await adminAuth.createUser({
      uid: `github_${githubId}`,
      email,
      displayName,
      photoURL: picture,
      emailVerified: true,
    })
    firebaseUid = created.uid
  }

  // Create a short-lived custom token the client can use to sign in
  const customToken = await adminAuth.createCustomToken(firebaseUid)

  // Clear the CSRF cookie and redirect the client to finish sign-in
  const response = NextResponse.redirect(
    `${appUrl}/auth/callback?token=${encodeURIComponent(customToken)}`
  )
  response.cookies.delete('oauth_state')
  return response
}
