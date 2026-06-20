'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import toast from 'react-hot-toast'
import { useAuth } from '@/app/contexts/AuthContext'
import ThemeToggle from '@/app/components/ThemeToggle'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { getOAuthConfig, OAuthConfig } from '@/app/services/adminService'

export default function HomePage() {
  const router = useRouter()
  const { currentUser, signInWithTwitter, signInWithFacebook } = useAuth()
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [isGithubLoading, setIsGithubLoading] = useState(false)
  const [isTwitterLoading, setIsTwitterLoading] = useState(false)
  const [isFacebookLoading, setIsFacebookLoading] = useState(false)
  const [isTiktokLoading, setIsTiktokLoading] = useState(false)
  const [oauthConfig, setOauthConfig] = useState<OAuthConfig>({
    google: true,
    github: true,
    twitter: true,
    facebook: true,
    tiktok: true,
  })

  useEffect(() => {
    if (currentUser) router.push('/library')
  }, [currentUser, router])

  useEffect(() => {
    getOAuthConfig().then(setOauthConfig).catch(() => {})
  }, [])

  const handleGoogleSignIn = () => {
    setIsGoogleLoading(true)
    window.location.href = '/api/auth/google'
  }

  const handleGithubSignIn = () => {
    setIsGithubLoading(true)
    window.location.href = '/api/auth/github'
  }

  const handleTiktokSignIn = () => {
    setIsTiktokLoading(true)
    window.location.href = '/api/auth/tiktok'
  }

  const handleTwitterSignIn = async () => {
    setIsTwitterLoading(true)
    try {
      await signInWithTwitter()
      // The currentUser effect above redirects to /library on success.
    } catch (err: unknown) {
      const code = err instanceof Error && 'code' in err ? (err as { code: string }).code : ''
      // Silently ignore the user closing/cancelling the popup.
      if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        toast.error(err instanceof Error ? err.message : 'Sign-in failed. Please try again.')
      }
      setIsTwitterLoading(false)
    }
  }

  const handleFacebookSignIn = async () => {
    setIsFacebookLoading(true)
    try {
      await signInWithFacebook()
      // The currentUser effect above redirects to /library on success.
    } catch (err: unknown) {
      const code = err instanceof Error && 'code' in err ? (err as { code: string }).code : ''
      // Silently ignore the user closing/cancelling the popup.
      if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        toast.error(err instanceof Error ? err.message : 'Sign-in failed. Please try again.')
      }
      setIsFacebookLoading(false)
    }
  }

  return (
    <div className="min-h-screen gradient-bg flex flex-col lg:flex-row">
      {/* Left — Brand Panel */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden items-center justify-center p-16">
        {/* Decorative orbs */}
        <div className="absolute top-1/4 -left-16 w-80 h-80 rounded-full bg-violet-500/20 dark:bg-violet-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-0 w-64 h-64 rounded-full bg-indigo-500/20 dark:bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-lg animate-fade-in">
          <div className="flex items-center gap-4 mb-8">
            <Image
              src="/game logo.jpeg"
              alt="SkillForge Logo"
              width={64}
              height={64}
              className="rounded-2xl shadow-lg"
              priority
            />
            <span className="text-2xl font-bold tracking-tight">SkillForge</span>
          </div>
          <h1 className="text-5xl xl:text-6xl font-bold leading-tight tracking-tight mb-6">
            Your{' '}
            <span className="text-gradient">learning</span>
            <br />playground.
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Master new skills through interactive games, compete on leaderboards,
            and track your progress across 22 games.
          </p>

          {/* Stats row */}
          <div className="mt-10 flex items-center gap-8">
            {[['22', 'Games'], ['Free', 'To Play'], ['100%', 'Browser-Based']].map(([num, label]) => (
              <div key={label}>
                <p className="text-2xl font-bold text-foreground">{num}</p>
                <p className="text-sm text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — Auth Panel */}
      <div className="flex flex-1 items-center justify-center p-6 sm:p-10 relative">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-sm animate-scale-in">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8 justify-center">
            <Image src="/game logo.jpeg" alt="SkillForge" width={48} height={48} className="rounded-xl shadow" priority />
            <span className="text-xl font-bold">SkillForge</span>
          </div>

          <div className="surface p-8 shadow-xl dark:shadow-black/30">
            <div className="mb-6">
              <h2 className="text-2xl font-bold tracking-tight">Get started</h2>
              <p className="text-sm text-muted-foreground mt-1">Sign in or create your account</p>
            </div>

            {/* Google sign in */}
            {oauthConfig.google && (
              <Button
                variant="outline"
                className="w-full h-11 gap-3 font-medium"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading}
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {isGoogleLoading ? 'Signing in…' : 'Continue with Google'}
              </Button>
            )}

            {/* GitHub sign in */}
            {oauthConfig.github && (
              <Button
                variant="outline"
                className="w-full h-11 gap-3 font-medium mt-3"
                onClick={handleGithubSignIn}
                disabled={isGithubLoading}
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.29-.01-1.04-.02-2.05-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6.01 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.62-5.49 5.92.43.37.81 1.1.81 2.22 0 1.61-.01 2.9-.01 3.29 0 .32.21.7.82.58A12 12 0 0 0 24 12.5C24 5.87 18.63.5 12 .5z"/>
                </svg>
                {isGithubLoading ? 'Signing in…' : 'Continue with GitHub'}
              </Button>
            )}

            {/* X (Twitter) sign in */}
            {oauthConfig.twitter && (
              <Button
                variant="outline"
                className="w-full h-11 gap-3 font-medium mt-3"
                onClick={handleTwitterSignIn}
                disabled={isTwitterLoading}
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                {isTwitterLoading ? 'Signing in…' : 'Continue with X'}
              </Button>
            )}

            {/* Facebook sign in */}
            {oauthConfig.facebook && (
              <Button
                variant="outline"
                className="w-full h-11 gap-3 font-medium mt-3"
                onClick={handleFacebookSignIn}
                disabled={isFacebookLoading}
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="#1877F2" aria-hidden="true">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                {isFacebookLoading ? 'Signing in…' : 'Continue with Facebook'}
              </Button>
            )}

            {/* TikTok sign in */}
            {oauthConfig.tiktok && (
              <Button
                variant="outline"
                className="w-full h-11 gap-3 font-medium mt-3"
                onClick={handleTiktokSignIn}
                disabled={isTiktokLoading}
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                </svg>
                {isTiktokLoading ? 'Signing in…' : 'Continue with TikTok'}
              </Button>
            )}

            <div className="relative my-5">
              <Separator />
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="bg-card px-3 text-xs text-muted-foreground">or continue with email</span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
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
