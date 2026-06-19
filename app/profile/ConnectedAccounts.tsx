'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { User as FirebaseUser } from 'firebase/auth'
import { UserProfile } from '@/app/types'
import { getSignInMethods, type LinkableProvider } from '@/app/services/userProfileService'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const LINK_ERROR_MESSAGES: Record<string, string> = {
  already_linked: 'That account is already linked to another SkillForge user.',
  provider_has_account: 'That account already has its own SkillForge profile. Sign in with it directly instead.',
  invalid_session: 'Your session expired. Please try linking again.',
  invalid_state: 'Linking failed (security check). Please try again.',
  google_cancelled: 'Google sign-in was cancelled.',
  github_cancelled: 'GitHub sign-in was cancelled.',
  token_exchange_failed: 'Could not complete sign-in with the provider. Please try again.',
  userinfo_failed: 'Could not read your profile from the provider. Please try again.',
  github_no_email: 'Your GitHub account has no verified email to link.',
  google_no_email: 'Your Google account returned no email to link.',
}

const PROVIDER_LABELS: Record<LinkableProvider, string> = {
  google: 'Google',
  github: 'GitHub',
}

function GoogleIcon() {
  return (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

function GithubIcon() {
  return (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.29-.01-1.04-.02-2.05-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6.01 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.62-5.49 5.92.43.37.81 1.1.81 2.22 0 1.61-.01 2.9-.01 3.29 0 .32.21.7.82.58A12 12 0 0 0 24 12.5C24 5.87 18.63.5 12 .5z" />
    </svg>
  )
}

interface ConnectedAccountsProps {
  user: FirebaseUser
  profile: UserProfile | null
  onProfileChange: React.Dispatch<React.SetStateAction<UserProfile | null>>
}

export default function ConnectedAccounts({ user, profile, onProfileChange }: ConnectedAccountsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [busy, setBusy] = useState<LinkableProvider | null>(null)

  const methods = getSignInMethods(user, profile)

  // Surface the outcome of a redirect-based link flow, then clean the URL.
  useEffect(() => {
    const linked = searchParams.get('linked')
    const error = searchParams.get('error')
    if (linked) {
      toast.success(`${PROVIDER_LABELS[linked as LinkableProvider] ?? linked} connected`)
    } else if (error) {
      toast.error(LINK_ERROR_MESSAGES[error] ?? 'Linking failed. Please try again.')
    }
    if (linked || error) {
      router.replace('/profile')
    }
  }, [searchParams, router])

  const handleConnect = async (provider: LinkableProvider) => {
    try {
      setBusy(provider)
      const token = await user.getIdToken()
      const res = await fetch('/api/auth/link/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ provider }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Failed to start linking')
      }
      window.location.href = data.url
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to connect')
      setBusy(null)
    }
  }

  const handleDisconnect = async (provider: LinkableProvider) => {
    try {
      setBusy(provider)
      const token = await user.getIdToken()
      const res = await fetch('/api/auth/link/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ provider }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Failed to disconnect')
      }
      onProfileChange((p) => {
        if (!p) return p
        const next = { ...(p.linkedProviders || {}) }
        delete next[provider]
        return { ...p, linkedProviders: next }
      })
      toast.success(`${PROVIDER_LABELS[provider]} disconnected`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to disconnect')
    } finally {
      setBusy(null)
    }
  }

  const providerRows: { id: LinkableProvider; label: string; icon: React.ReactNode; state: typeof methods.google }[] = [
    { id: 'google', label: 'Google', icon: <GoogleIcon />, state: methods.google },
    { id: 'github', label: 'GitHub', icon: <GithubIcon />, state: methods.github },
  ]

  return (
    <div className="surface p-6">
      <h3 className="text-base font-semibold mb-1">Connected Accounts</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Link sign-in methods so you can access your account in more ways.
      </p>

      <div className="space-y-3">
        {/* Email & password */}
        <div className="flex items-center gap-3 rounded-lg border border-border/60 p-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M2.5 5.5A2.5 2.5 0 015 3h10a2.5 2.5 0 012.5 2.5v9A2.5 2.5 0 0115 17H5a2.5 2.5 0 01-2.5-2.5v-9zm2.2-.5l5.3 3.7L15.3 5H4.7zM16 6.6l-5.4 3.8a1 1 0 01-1.2 0L4 6.6v7.9c0 .55.45 1 1 1h10c.55 0 1-.45 1-1V6.6z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Email &amp; Password</p>
            <p className="truncate text-xs text-muted-foreground">
              {methods.password ? user.email : 'Not enabled'}
            </p>
          </div>
          {methods.password ? (
            <Badge variant="secondary" className="shrink-0">Enabled</Badge>
          ) : (
            <span className="shrink-0 text-xs text-muted-foreground">—</span>
          )}
        </div>

        {/* OAuth providers */}
        {providerRows.map(({ id, label, icon, state }) => (
          <div key={id} className="flex items-center gap-3 rounded-lg border border-border/60 p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
              {icon}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{label}</p>
              <p className="truncate text-xs text-muted-foreground">
                {state.connected ? state.email || 'Connected' : 'Not connected'}
              </p>
            </div>

            {state.connected ? (
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant="secondary">Connected</Badge>
                {state.linked && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-destructive hover:bg-destructive/5 hover:text-destructive"
                    onClick={() => handleDisconnect(id)}
                    disabled={busy === id}
                  >
                    {busy === id ? '…' : 'Disconnect'}
                  </Button>
                )}
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="h-8 shrink-0 px-3"
                onClick={() => handleConnect(id)}
                disabled={busy === id}
              >
                {busy === id ? 'Connecting…' : 'Connect'}
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
