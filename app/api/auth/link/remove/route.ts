import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth, getAdminDb } from '@/app/lib/firebase-admin'
import { removeOAuthLink } from '@/app/lib/oauthLinks'
import type { OAuthProvider } from '@/app/lib/oauth'

// Disconnects a linked OAuth provider from the signed-in account, refusing to
// remove the user's only remaining sign-in method (which would lock them out).
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = authHeader.split('Bearer ')[1]
  let uid: string
  try {
    uid = (await getAdminAuth().verifyIdToken(token)).uid
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as { provider?: string }
  const provider = body.provider as OAuthProvider
  if (provider !== 'google' && provider !== 'github' && provider !== 'tiktok') {
    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
  }

  const profileSnap = await getAdminDb().collection('users').doc(uid).get()
  const linked = (profileSnap.data()?.linkedProviders || {}) as Record<string, unknown>
  if (!linked[provider]) {
    return NextResponse.json({ error: 'Provider is not linked' }, { status: 400 })
  }

  // Count the sign-in methods that would survive removal: password, the account's
  // native provider (implied by uid prefix), and any other linked providers.
  const userRecord = await getAdminAuth().getUser(uid)
  const remaining = new Set<string>()
  if (userRecord.providerData.some((p) => p.providerId === 'password')) remaining.add('password')
  if (uid.startsWith('google_')) remaining.add('google')
  if (uid.startsWith('github_')) remaining.add('github')
  if (uid.startsWith('tiktok_')) remaining.add('tiktok')
  Object.keys(linked)
    .filter((p) => p !== provider)
    .forEach((p) => remaining.add(p))

  if (remaining.size === 0) {
    return NextResponse.json(
      { error: 'Cannot remove your only sign-in method. Set a password or link another account first.' },
      { status: 400 },
    )
  }

  await removeOAuthLink(uid, provider)
  return NextResponse.json({ success: true })
}
