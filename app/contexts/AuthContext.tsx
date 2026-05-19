'use client'

import React, { useEffect, useState, createContext, useContext } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  User as FirebaseUser,
  UserCredential,
} from 'firebase/auth'
import { auth } from '@/app/lib/firebase'
import { AuthContextType } from '@/app/types'
import { ensureUserProfileDocument } from '@/app/services/userProfileService'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null)
  const [loading, setLoading] = useState(true)

  async function signup(email: string, password: string): Promise<UserCredential> {
    return createUserWithEmailAndPassword(auth, email, password)
  }

  async function login(email: string, password: string): Promise<UserCredential> {
    return signInWithEmailAndPassword(auth, email, password)
  }

  async function signInWithGoogle(): Promise<{ method: string; result: UserCredential }> {
    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({ prompt: 'select_account' })

    const result = await signInWithPopup(auth, provider)
    
    // Ensure profile exists for Google users (creates if missing)
    try {
      await ensureUserProfileDocument(result.user)
    } catch (err) {
      console.error('Failed to ensure Google user profile:', err)
    }
    
    return {
      method: 'popup',
      result,
    }
  }

  async function signInWithFacebook(): Promise<{ method: string; result: UserCredential }> {
    const provider = new FacebookAuthProvider()

    let result: UserCredential
    try {
      result = (await signInWithPopup(auth, provider)) as UserCredential
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        'code' in err &&
        (err as { code: string }).code === 'auth/account-exists-with-different-credential'
      ) {
        throw new Error('An account with this email already exists. Please log in with Google or your email/password instead.')
      }
      throw err
    }

    try {
      await ensureUserProfileDocument(result.user)
    } catch (err) {
      console.error('Failed to ensure Facebook user profile:', err)
    }

    return {
      method: 'popup',
      result,
    }
  }

  function logout(): Promise<void> {
    return signOut(auth)
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user)
      
      // Ensure Firestore profile exists (creates if missing - fixes orphaned auth users)
      if (user) {
        try {
          await ensureUserProfileDocument(user)
        } catch (err) {
          console.error('Failed to ensure user profile:', err)
        }
      }
      
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const value: AuthContextType = {
    currentUser,
    signup,
    login,
    signInWithGoogle,
    signInWithFacebook,
    logout,
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
