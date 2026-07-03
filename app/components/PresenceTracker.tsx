'use client'

import { useEffect } from 'react'
import { useAuth } from '@/app/contexts/AuthContext'

/**
 * Writes a presence heartbeat (presence/{uid} = { uid, lastActiveAt }) while the
 * signed-in user's tab is visible, so the app can count who is actively online.
 * Fires on mount, on a fixed interval, and whenever the tab returns to the
 * foreground. Best-effort — failures are swallowed. Renders nothing.
 */
const HEARTBEAT_MS = 60_000

export default function PresenceTracker() {
  const { currentUser } = useAuth()
  const uid = currentUser?.uid

  useEffect(() => {
    if (!uid) return
    let cancelled = false

    const beat = async () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
      try {
        const { db } = await import('@/app/lib/firebase')
        const { doc, setDoc, serverTimestamp } = await import('firebase/firestore')
        if (cancelled) return
        // Full overwrite keeps the doc to exactly { uid, lastActiveAt } (matches the rule's hasOnly).
        await setDoc(doc(db, 'presence', uid), { uid, lastActiveAt: serverTimestamp() })
      } catch {
        /* presence is non-critical */
      }
    }

    beat()
    const interval = setInterval(beat, HEARTBEAT_MS)
    const onVisibility = () => { if (document.visibilityState === 'visible') beat() }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [uid])

  return null
}
