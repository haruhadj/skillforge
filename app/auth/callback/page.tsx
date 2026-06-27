'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { signInWithCustomToken } from 'firebase/auth'
import { auth } from '@/app/lib/firebase'
import { ensureUserProfileDocument } from '@/app/services/userProfileService'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // The custom token is delivered in an httpOnly cookie (not the URL); exchange it
    // once via the read-and-clear endpoint, then complete Firebase sign-in.
    ;(async () => {
      let token: string
      try {
        const res = await fetch('/api/auth/token', { cache: 'no-store' })
        if (!res.ok) {
          router.replace('/?error=missing_token')
          return
        }
        token = (await res.json()).token
      } catch {
        router.replace('/?error=missing_token')
        return
      }

      try {
        const credential = await signInWithCustomToken(auth, token)
        try {
          await ensureUserProfileDocument(credential.user)
        } catch {
          // non-fatal
        }
        router.replace('/library')
      } catch {
        setError('Sign-in failed. Please try again.')
      }
    })()
  }, [router])

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
