'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/app/contexts/AuthContext'
import ThemeToggle from '@/app/components/ThemeToggle'
import { Button } from '@/components/ui/button'
import { getOAuthConfig, OAuthConfig } from '@/app/services/adminService'
import { defaultGames } from '@/app/games/games'

const GAME_COUNT = defaultGames.filter((g) => g.enabled !== false).length

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin shrink-0" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  )
}

export default function HomePage() {
  const router = useRouter()
  const { currentUser } = useAuth()
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [isGithubLoading, setIsGithubLoading] = useState(false)
  const [isTwitterLoading, setIsTwitterLoading] = useState(false)
  const [isDiscordLoading, setIsDiscordLoading] = useState(false)
  const [oauthConfig, setOauthConfig] = useState<OAuthConfig>({
    google: true,
    github: true,
    twitter: true,
    discord: true,
  })

  useEffect(() => {
    if (currentUser) router.push('/library')
  }, [currentUser, router])

  useEffect(() => {
    getOAuthConfig().then(setOauthConfig).catch(() => {})
  }, [])

  const handleGoogleSignIn = () => { setIsGoogleLoading(true); window.location.href = '/api/auth/google' }
  const handleGithubSignIn = () => { setIsGithubLoading(true); window.location.href = '/api/auth/github' }
  const handleTwitterSignIn = () => { setIsTwitterLoading(true); window.location.href = '/api/auth/twitter' }
  const handleDiscordSignIn = () => { setIsDiscordLoading(true); window.location.href = '/api/auth/discord' }

  const secondaryCount = [oauthConfig.github, oauthConfig.twitter, oauthConfig.discord].filter(Boolean).length
  const hasSecondaryOAuth = secondaryCount > 0

  return (
    <div className="min-h-screen gradient-bg flex flex-col lg:flex-row">
      {/* Left — Brand Panel */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden items-center hero-gradient p-16">
        <div className="absolute -top-20 -left-16 w-80 h-80 rounded-full bg-white/12 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 right-0 w-72 h-72 rounded-full bg-cyan-400/30 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-lg animate-fade-in text-white">
          <div className="flex items-center gap-3.5 mb-12">
            <Image
              src="/game logo.jpeg"
              alt="SkillForge Logo"
              width={64}
              height={64}
              className="rounded-xl shadow-lg"
              priority
            />
            <span className="text-xl font-bold tracking-tight">SkillForge</span>
          </div>
          <h1 className="text-5xl xl:text-6xl font-extrabold leading-[1.02] tracking-tight mb-6">
            Your learning<br />playground.
          </h1>
          <p className="text-lg text-white/85 leading-relaxed max-w-md">
            Master new skills through {GAME_COUNT} interactive games. Climb the ranks,
            top the leaderboard, and track every point you earn.
          </p>
          <div className="mt-11 flex items-center gap-11">
            {[[String(GAME_COUNT), 'Games'], ['Free', 'To play'], ['100%', 'Browser-based']].map(([num, label]) => (
              <div key={label}>
                <p className="mono text-3xl font-semibold">{num}</p>
                <p className="text-sm text-white/70 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — Auth Panel */}
      <div className="flex flex-1 items-center justify-center px-5 py-10 sm:p-10 relative">
        <div className="absolute top-4 right-4 z-10">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-[360px] animate-scale-in">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-7 justify-center">
            <Image src="/game logo.jpeg" alt="SkillForge" width={64} height={64} className="rounded-xl shadow" priority />
            <span className="text-xl font-bold">SkillForge</span>
          </div>

          {/* Auth Card */}
          <div className="glass shadow-xl dark:shadow-black/40 p-7 sm:p-8">
            {/* Header */}
            <div className="mb-6">
              <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-[11px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded-full mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                {GAME_COUNT} games · Free
              </div>
              <h2 className="text-2xl font-bold tracking-tight">Get started</h2>
              <p className="text-sm text-muted-foreground mt-1">Sign in or create your account</p>
            </div>

            {/* Google — Primary provider */}
            {oauthConfig.google && (
              <Button
                variant="outline"
                className="w-full h-12 gap-3 font-semibold text-sm hover:border-primary/40 hover:bg-primary/5"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading}
              >
                {isGoogleLoading ? <Spinner /> : (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                {isGoogleLoading ? 'Signing in…' : 'Continue with Google'}
              </Button>
            )}

            {/* Secondary OAuth — compact 2/3-col grid */}
            {hasSecondaryOAuth && (
              <>
                <Divider label={oauthConfig.google ? 'or' : 'sign in with'} />
                <div
                  className="grid gap-2"
                  style={{ gridTemplateColumns: `repeat(${secondaryCount}, minmax(0, 1fr))` }}
                >
                  {oauthConfig.github && (
                    <Button
                      variant="outline"
                      className="h-10 gap-1.5 text-xs font-medium px-3 hover:border-primary/40 hover:bg-primary/5"
                      onClick={handleGithubSignIn}
                      disabled={isGithubLoading}
                    >
                      {isGithubLoading ? <Spinner /> : (
                        <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.29-.01-1.04-.02-2.05-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6.01 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.62-5.49 5.92.43.37.81 1.1.81 2.22 0 1.61-.01 2.9-.01 3.29 0 .32.21.7.82.58A12 12 0 0 0 24 12.5C24 5.87 18.63.5 12 .5z"/>
                        </svg>
                      )}
                      <span>{isGithubLoading ? '…' : 'GitHub'}</span>
                    </Button>
                  )}
                  {oauthConfig.twitter && (
                    <Button
                      variant="outline"
                      className="h-10 gap-1.5 text-xs font-medium px-3 hover:border-primary/40 hover:bg-primary/5"
                      onClick={handleTwitterSignIn}
                      disabled={isTwitterLoading}
                    >
                      {isTwitterLoading ? <Spinner /> : (
                        <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                      )}
                      <span>{isTwitterLoading ? '…' : 'X'}</span>
                    </Button>
                  )}
                  {oauthConfig.discord && (
                    <Button
                      variant="outline"
                      className="h-10 gap-1.5 text-xs font-medium px-3 hover:border-[#5865F2]/40 hover:bg-[#5865F2]/5"
                      onClick={handleDiscordSignIn}
                      disabled={isDiscordLoading}
                    >
                      {isDiscordLoading ? <Spinner /> : (
                        <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="#5865F2">
                          <path d="M20.317 4.369a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.6 12.6 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.74 19.74 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.891.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                        </svg>
                      )}
                      <span>{isDiscordLoading ? '…' : 'Discord'}</span>
                    </Button>
                  )}
                </div>
              </>
            )}

            {/* Email divider */}
            <Divider label="or continue with email" />

            {/* Email CTAs */}
            <div className="grid grid-cols-2 gap-2.5">
              <Button asChild className="h-11 font-semibold">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild variant="secondary" className="h-11 font-semibold">
                <Link href="/signup">Create account</Link>
              </Button>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
