'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '@/app/contexts/AuthContext'
import { useTheme } from '@/app/contexts/ThemeContext'
import { getUserProfile } from '@/app/services/userProfileService'

/**
 * Bridges the signed-in user's saved appearance preferences (users/{uid}.preferences)
 * into the client-side ThemeContext, so a chosen theme/accent follows them across
 * devices. localStorage is the fast local cache; the profile doc is the source of
 * truth on a fresh device. Runs once per uid and never writes back (settings UI owns
 * the write path), so it can't loop. Renders nothing.
 */
export default function PreferenceSync() {
  const { currentUser } = useAuth()
  const { setDarkMode, setAccent } = useTheme()
  const appliedFor = useRef<string | null>(null)

  useEffect(() => {
    const uid = currentUser?.uid
    if (!uid || appliedFor.current === uid) return
    appliedFor.current = uid
    getUserProfile(uid)
      .then((profile) => {
        const prefs = profile?.preferences
        if (!prefs) return
        if (prefs.theme === 'dark' || prefs.theme === 'light') setDarkMode(prefs.theme === 'dark')
        if (prefs.accent) setAccent(prefs.accent)
      })
      .catch(() => {})
  }, [currentUser?.uid, setDarkMode, setAccent])

  return null
}
