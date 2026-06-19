import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth, getAdminDb } from '@/app/lib/firebase-admin'
import { QueryDocumentSnapshot, DocumentData } from 'firebase-admin/firestore'
import { getOAuthLinksForUid } from '@/app/lib/oauthLinks'

export async function POST(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.split('Bearer ')[1]
    
    // Verify the token and get the user
    let uid: string
    try {
      const decodedToken = await getAdminAuth().verifyIdToken(token)
      uid = decodedToken.uid
    } catch (tokenError) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Delete user from Firebase Auth
    let authDeleted = false
    try {
      await getAdminAuth().deleteUser(uid)
      authDeleted = true
      console.log(`[Delete Account] Auth user ${uid} deleted successfully`)
    } catch (authError) {
      console.error('[Delete Account] Auth deletion error:', authError)
      const errorCode = (authError as { code?: string }).code
      const errorMessage = authError instanceof Error ? authError.message : String(authError)
      
      // Continue if user not found (already deleted)
      if (errorCode !== 'auth/user-not-found' && !errorMessage.includes('not-found')) {
        throw new Error(`Failed to delete auth user: ${errorMessage}`)
      }
      console.log(`[Delete Account] Auth user ${uid} not found, continuing with Firestore cleanup`)
    }

    // Delete user's Firestore data
    const adminDb = getAdminDb()
    
    // Get user profile to find username for cleanup
    const userRef = adminDb.collection('users').doc(uid)
    const userSnap = await userRef.get()
    const userData = userSnap.data()
    const usernameNormalized = userData?.usernameNormalized

    const batch = adminDb.batch()

    // Delete user profile
    batch.delete(userRef)

    // Delete scores subcollection
    const scoresSnap = await adminDb.collection('users').doc(uid).collection('scores').get()
    scoresSnap.docs.forEach((d: QueryDocumentSnapshot<DocumentData>) => batch.delete(d.ref))

    // Delete gameStats subcollection
    const statsSnap = await adminDb.collection('users').doc(uid).collection('gameStats').get()
    statsSnap.docs.forEach((d: QueryDocumentSnapshot<DocumentData>) => batch.delete(d.ref))

    // Delete any OAuth provider links pointing at this account
    const oauthLinkDocs = await getOAuthLinksForUid(uid)
    oauthLinkDocs.forEach((d) => batch.delete(d.ref))

    await batch.commit()
    console.log(`[Delete Account] Firestore data for ${uid} deleted successfully`)

    // Delete username entry if exists
    if (usernameNormalized) {
      try {
        await adminDb.collection('usernames').doc(usernameNormalized).delete()
        console.log(`[Delete Account] Username '${usernameNormalized}' deleted from usernames collection`)
      } catch (usernameError) {
        console.log(`[Delete Account] Username '${usernameNormalized}' not found or already deleted`)
      }
    }

    return NextResponse.json({ 
      success: true, 
      authDeleted,
      firestoreDeleted: true 
    })
  } catch (error) {
    console.error('Delete account error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete account' },
      { status: 500 }
    )
  }
}
