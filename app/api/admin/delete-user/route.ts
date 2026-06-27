import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth, getAdminDb } from '@/app/lib/firebase-admin'
import { QueryDocumentSnapshot, DocumentData } from 'firebase-admin/firestore'

export async function POST(request: NextRequest) {
  try {
    // Require a valid Firebase ID token belonging to an admin caller.
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split('Bearer ')[1]
    let callerUid: string
    try {
      const decodedToken = await getAdminAuth().verifyIdToken(token)
      callerUid = decodedToken.uid
    } catch (tokenError) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const callerSnap = await getAdminDb().collection('users').doc(callerUid).get()
    if (callerSnap.data()?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { uid } = await request.json()

    if (!uid || typeof uid !== 'string') {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Delete user from Firebase Auth
    let authDeleted = false
    try {
      await getAdminAuth().deleteUser(uid)
      authDeleted = true
      console.log(`[Delete User] Auth user ${uid} deleted successfully`)
    } catch (authError) {
      // Log the full error for debugging
      console.error('[Delete User] Auth deletion error:', authError)
      
      // Check if it's a "not found" error - Firebase Admin uses error.code, not message
      const errorCode = (authError as { code?: string }).code
      const errorMessage = authError instanceof Error ? authError.message : String(authError)
      
      // Continue to Firestore cleanup only if user not found in Auth
      if (errorCode !== 'auth/user-not-found' && !errorMessage.includes('not-found')) {
        throw new Error(`Failed to delete auth user: ${errorMessage}`)
      }
      console.log(`[Delete User] Auth user ${uid} not found, continuing with Firestore cleanup`)
    }

    // Delete user's Firestore data
    const adminDb = getAdminDb()
    const batch = adminDb.batch()

    // Get user profile to find username for cleanup
    const userRef = adminDb.collection('users').doc(uid)
    const userSnap = await userRef.get()
    const userData = userSnap.data()
    const usernameNormalized = userData?.usernameNormalized

    // Delete user profile
    batch.delete(userRef)

    // Delete scores subcollection
    const scoresSnap = await adminDb.collection('users').doc(uid).collection('scores').get()
    scoresSnap.docs.forEach((d: QueryDocumentSnapshot<DocumentData>) => batch.delete(d.ref))

    // Delete gameStats subcollection
    const statsSnap = await adminDb.collection('users').doc(uid).collection('gameStats').get()
    statsSnap.docs.forEach((d: QueryDocumentSnapshot<DocumentData>) => batch.delete(d.ref))

    await batch.commit()
    console.log(`[Delete User] Firestore data for ${uid} deleted successfully`)

    // Delete username entry if exists (do this after batch to avoid transaction conflicts)
    if (usernameNormalized) {
      try {
        await adminDb.collection('usernames').doc(usernameNormalized).delete()
        console.log(`[Delete User] Username '${usernameNormalized}' deleted from usernames collection`)
      } catch (usernameError) {
        console.log(`[Delete User] Username '${usernameNormalized}' not found or already deleted`)
      }
    }

    return NextResponse.json({ 
      success: true, 
      authDeleted,
      firestoreDeleted: true 
    })
  } catch (error) {
    // Log full detail server-side; return a generic message so wrapped Firebase
    // Admin internals don't leak to the client (audit S6).
    console.error('Delete user error:', error)
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}
