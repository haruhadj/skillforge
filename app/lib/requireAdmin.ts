import { NextRequest } from 'next/server'
import { getAdminAuth, getAdminDb } from '@/app/lib/firebase-admin'

/**
 * Result of an admin-gate check. Either an authorized admin uid, or a ready-to-return
 * { status, error } so the route can `if (!gate.ok) return NextResponse.json(...)`.
 */
export type AdminGate =
  | { ok: true; uid: string }
  | { ok: false; status: number; error: string }

/**
 * Verify the caller is an authenticated admin.
 *
 * The route uses the Admin SDK (which bypasses Firestore rules), so the admin gate must
 * be explicit here: the caller must present a valid Firebase ID token (Authorization:
 * Bearer <token>) AND the resolved uid's users/{uid}.role must be 'admin'. This mirrors
 * the token-verification model in app/api/games/score/route.ts. (audit R17 — admin caching)
 */
export async function requireAdmin(request: NextRequest): Promise<AdminGate> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return { ok: false, status: 401, error: 'Unauthorized' }
  }
  const token = authHeader.split('Bearer ')[1]

  let uid: string
  try {
    const decoded = await getAdminAuth().verifyIdToken(token)
    uid = decoded.uid
  } catch {
    return { ok: false, status: 401, error: 'Invalid token' }
  }

  const snap = await getAdminDb().collection('users').doc(uid).get()
  if (!snap.exists || snap.data()?.role !== 'admin') {
    return { ok: false, status: 403, error: 'Forbidden' }
  }

  return { ok: true, uid }
}
