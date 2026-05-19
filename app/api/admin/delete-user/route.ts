import { NextRequest, NextResponse } from 'next/server'
import { auth, db } from '@/app/lib/firebase-admin'
import { QueryDocumentSnapshot, DocumentData } from 'firebase-admin/firestore'

export async function POST(request: NextRequest) {
  try {
    const { uid } = await request.json()

    if (!uid || typeof uid !== 'string') {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Delete user from Firebase Auth
    try {
      await auth.deleteUser(uid)
    } catch (authError) {
      // If user not found in Auth, continue to clean up Firestore
      if (authError instanceof Error && !authError.message.includes('not-found')) {
        throw authError
      }
    }

    // Delete user's Firestore data
    const batch = db.batch()

    // Delete user profile
    const userRef = db.collection('users').doc(uid)
    batch.delete(userRef)

    // Delete scores subcollection
    const scoresSnap = await db.collection('users').doc(uid).collection('scores').get()
    scoresSnap.docs.forEach((d: QueryDocumentSnapshot<DocumentData>) => batch.delete(d.ref))

    // Delete gameStats subcollection
    const statsSnap = await db.collection('users').doc(uid).collection('gameStats').get()
    statsSnap.docs.forEach((d: QueryDocumentSnapshot<DocumentData>) => batch.delete(d.ref))

    await batch.commit()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete user' },
      { status: 500 }
    )
  }
}
