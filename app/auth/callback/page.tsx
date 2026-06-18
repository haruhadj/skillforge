'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signInWithCustomToken } from 'firebase/auth'
import { auth } from '@/app/lib/firebase'
import { ensureUserProfileDocument } from '@/app/services/userProfileService'

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) {
      router.replace('/?error=missing_token')
      return
    }

    signInWithCustomToken(auth, token)
      .then(async (credential) => {
        try {
          await ensureUserProfileDocument(credential.user)
        } catch {
          // non-fatal
        }
        router.replace('/library')
      })
      .catch(() => {
        setError('Sign-in failed. Please try again.')
      })
  }, [router, searchParams])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">{error}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground">Signing you in…</p>
    </div>
  )
}
