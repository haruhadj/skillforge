'use client'

import React, { useEffect, useState, createContext, useContext } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  User as FirebaseUser,
  UserCredential,
} from 'firebase/auth'
import { auth } from '@/app/lib/firebase'
import { AuthContextType } from '@/app/types'
import { ensureUserProfileDocument } from '@/app/services/userProfileService'
import { detectDevice } from '@/app/lib/deviceInfo'

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
    try {
      await ensureUserProfileDocument(result.user)
    } catch (err) {
      console.error('Failed to ensure Google user profile:', err)
    }
    return { method: 'popup', result }
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
          const deviceInfo = detectDevice()
          await ensureUserProfileDocument(user, deviceInfo)
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
