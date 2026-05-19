import { initializeApp, getApps, cert, type App } from 'firebase-admin/app'
import { getAuth, type Auth } from 'firebase-admin/auth'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'

// Initialize Firebase Admin SDK (lazy - only called at runtime)
function getFirebaseAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0]
  }

  // Check if we have the service account key JSON
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
    return initializeApp({
      credential: cert(serviceAccount),
    })
  }

  // Fallback to individual env vars
  if (process.env.FIREBASE_ADMIN_CLIENT_EMAIL && process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
    return initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    })
  }

  throw new Error('Firebase Admin credentials not configured')
}

// Lazy getters - only initialize when called at runtime
export function getAdminAuth(): Auth {
  return getAuth(getFirebaseAdminApp())
}

export function getAdminDb(): Firestore {
  return getFirestore(getFirebaseAdminApp())
}
