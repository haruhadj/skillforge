'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/app/contexts/AuthContext'
import ThemeToggle from '@/app/components/ThemeToggle'
import * as gameDataService from '@/app/services/gameDataService'
import { getUserProfile } from '@/app/services/userProfileService'
import { defaultGames } from '@/app/games/games'
import { UserProfile } from '@/app/types'

export default function OtherUserProfilePage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = use(params)
  const router = useRouter()
  const { currentUser } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [scores, setScores] = useState<Record<string, { bestScore: number }>>({})
  const [gameStats, setGameStats] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!uid) return
    async function loadProfile() {
      try {
        setLoading(true)
        const [loadedProfile, loadedScores, loadedGameStats] = await Promise.all([
          getUserProfile(uid),
          gameDataService.getAllScores(uid),
          gameDataService.getAllGameStats(uid),
        ])

        if (!loadedProfile) {
          setNotFound(true)
          return
        }

        setProfile(loadedProfile)
        setScores(loadedScores)
        setGameStats(loadedGameStats)
      } catch (error) {
        console.error('Failed to load profile:', error)
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [uid])

  if (!currentUser) {
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen gradient-bg">
        <header className="sticky top-0 z-10 glass border-b border-slate-200/50 dark:border-gray-700/50">
          <div className="mx-auto max-w-4xl px-6 py-4 flex items-center gap-3">
            <Link
              href="/leaderboard"
              className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.56l3.47 3.47a.75.75 0 11-1.06 1.06l-4.75-4.75a.75.75 0 010-1.06l4.75-4.75a.75.75 0 011.06 1.06L5.56 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
              </svg>
              Back
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white flex-1 text-center tracking-tight">Player Profile</h1>
            <ThemeToggle />
          </div>
        </header>
        <main className="mx-auto max-w-4xl px-6 py-8">
          <div className="glass p-8 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-slate-600 dark:text-gray-400">Loading profile...</p>
          </div>
        </main>
      </div>
    )
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen gradient-bg">
        <header className="sticky top-0 z-10 glass border-b border-slate-200/50 dark:border-gray-700/50">
          <div className="mx-auto max-w-4xl px-6 py-4 flex items-center gap-3">
            <Link
              href="/leaderboard"
              className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.56l3.47 3.47a.75.75 0 11-1.06 1.06l-4.75-4.75a.75.75 0 010-1.06l4.75-4.75a.75.75 0 011.06 1.06L5.56 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
              </svg>
              Back
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white flex-1 text-center tracking-tight">Player Profile</h1>
            <ThemeToggle />
          </div>
        </header>
        <main className="mx-auto max-w-4xl px-6 py-8">
          <div className="glass p-12 text-center">
            <div className="text-5xl mb-4">👤</div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Profile Not Found</h3>
            <p className="text-slate-600 dark:text-gray-400">This user profile could not be found.</p>
          </div>
        </main>
      </div>
    )
  }

  const name = profile.username || profile.email?.split('@')[0] || 'Unknown'
  const initials = name.slice(0, 2).toUpperCase()
  const photoURL = profile.photoThumbURL || profile.photoURL
  const isOwnProfile = profile.uid === currentUser.uid

  return (
    <div className="min-h-screen gradient-bg transition-colors duration-500">
      <header className="sticky top-0 z-10 glass border-b border-slate-200/50 dark:border-gray-700/50">
        <div className="mx-auto max-w-4xl px-6 py-4 flex items-center gap-3">
          <Link
            href="/leaderboard"
            className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.56l3.47 3.47a.75.75 0 11-1.06 1.06l-4.75-4.75a.75.75 0 010-1.06l4.75-4.75a.75.75 0 011.06 1.06L5.56 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
            </svg>
            Back
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white flex-1 text-center tracking-tight">
            {isOwnProfile ? 'My Profile' : 'Player Profile'}
          </h1>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <div className="space-y-6">
          {/* Profile Card */}
          <div className="glass p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center text-white text-2xl font-bold overflow-hidden shrink-0">
                {photoURL ? (
                  <img src={photoURL} alt={name} className="h-full w-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <div className="text-center sm:text-left flex-1">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{name}</h2>
                {profile.email && !isOwnProfile && (
                  <p className="text-slate-600 dark:text-gray-400 text-sm mt-1">{profile.email}</p>
                )}
                {isOwnProfile && (
                  <Link
                    href="/profile"
                    className="inline-block mt-2 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
                  >
                    Edit your profile →
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="glass p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Game Statistics</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {defaultGames.map((game) => {
                const gameScore = scores[game.id]?.bestScore
                const stats = gameStats[game.id] as Record<string, unknown> | undefined
                const historyLength = Array.isArray(stats?.history) ? (stats.history as unknown[]).length : 0
                const matchCount = (stats?.totalMatchCount as number) || (stats?.matchCount as number) || (stats?.totalGames as number) || historyLength || 0

                return (
                  <div key={game.id} className="bg-slate-50 dark:bg-gray-800/50 rounded-lg p-4">
                    <h4 className="font-semibold text-slate-900 dark:text-white">{game.name}</h4>
                    <div className="mt-3 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500 dark:text-gray-400">Best Score:</span>
                        <span className="font-medium text-slate-900 dark:text-white">
                          {gameScore !== undefined ? gameScore.toLocaleString() : '-'}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500 dark:text-gray-400">Matches:</span>
                        <span className="font-medium text-slate-900 dark:text-white">
                          {matchCount > 0 ? matchCount.toLocaleString() : '-'}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
