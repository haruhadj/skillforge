import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth } from '@/app/lib/firebase-admin'

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
  const { email, name, picture, id: googleId } = googleUser

  // Look up or create the Firebase user
  const adminAuth = getAdminAuth()
  let firebaseUid: string

  try {
    const existing = await adminAuth.getUserByEmail(email)
    firebaseUid = existing.uid
    // Keep displayName/photoURL up to date
    if (!existing.displayName || !existing.photoURL) {
      await adminAuth.updateUser(firebaseUid, {
        displayName: existing.displayName || name,
        photoURL: existing.photoURL || picture,
      })
    }
  } catch {
    // User doesn't exist — create them
    const created = await adminAuth.createUser({
      uid: `google_${googleId}`,
      email,
      displayName: name,
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
