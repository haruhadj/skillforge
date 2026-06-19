'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/app/contexts/AuthContext'
import ThemeToggle from '@/app/components/ThemeToggle'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

export default function HomePage() {
  const router = useRouter()
  const { currentUser } = useAuth()
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [isGithubLoading, setIsGithubLoading] = useState(false)

  useEffect(() => {
    if (currentUser) router.push('/library')
  }, [currentUser, router])

  const handleGoogleSignIn = () => {
    setIsGoogleLoading(true)
    window.location.href = '/api/auth/google'
  }

  const handleGithubSignIn = () => {
    setIsGithubLoading(true)
    window.location.href = '/api/auth/github'
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

            {/* GitHub sign in */}
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
