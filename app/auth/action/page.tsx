'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

const FIREBASE_ACTION_BASE = 'https://skillforge-7a058.firebaseapp.com/__/auth/action'

function ActionRedirect() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    window.location.replace(`${FIREBASE_ACTION_BASE}?${params.toString()}`)
  }, [searchParams])

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', textAlign: 'center', marginTop: '20vh' }}>
      <p>Redirecting…</p>
    </div>
  )
}

export default function AuthActionPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', marginTop: '20vh' }}>Loading…</div>}>
      <ActionRedirect />
    </Suspense>
  )
}
