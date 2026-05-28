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
  const [statSort, setStatSort] = useState<'name' | 'score' | 'matches' | 'played'>('played')

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
            <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Game Statistics</h3>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                <span className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wide shrink-0">Sort by</span>
                {(['played', 'score', 'matches', 'name'] as const).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setStatSort(opt)}
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                      statSort === opt
                        ? 'bg-indigo-600 text-white shadow'
                        : 'bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {opt === 'played' ? 'Played first' : opt === 'score' ? 'Best Score' : opt === 'matches' ? 'Matches' : 'Name'}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[...defaultGames].sort((a, b) => {
                const aScore = scores[a.id]?.bestScore ?? -1
                const bScore = scores[b.id]?.bestScore ?? -1
                const aStats = gameStats[a.id] as Record<string, unknown> | undefined
                const bStats = gameStats[b.id] as Record<string, unknown> | undefined
                const aMatches = (aStats?.totalMatchCount as number) || (aStats?.matchCount as number) || (aStats?.totalGames as number) || (Array.isArray(aStats?.history) ? (aStats.history as unknown[]).length : 0) || 0
                const bMatches = (bStats?.totalMatchCount as number) || (bStats?.matchCount as number) || (bStats?.totalGames as number) || (Array.isArray(bStats?.history) ? (bStats.history as unknown[]).length : 0) || 0
                const aPlayed = aScore >= 0 || aMatches > 0
                const bPlayed = bScore >= 0 || bMatches > 0
                if (statSort === 'score') return bScore - aScore
                if (statSort === 'matches') return bMatches - aMatches
                if (statSort === 'name') return a.name.localeCompare(b.name)
                if (aPlayed !== bPlayed) return aPlayed ? -1 : 1
                return a.name.localeCompare(b.name)
              }).map((game) => {
                const gameScore = scores[game.id]?.bestScore
                const stats = gameStats[game.id] as Record<string, unknown> | undefined
                const historyLength = Array.isArray(stats?.history) ? (stats.history as unknown[]).length : 0
                const matchCount = (stats?.totalMatchCount as number) || (stats?.matchCount as number) || (stats?.totalGames as number) || historyLength || 0
                const hasPlayed = gameScore !== undefined || matchCount > 0

                return (
                  <div key={game.id} className={`glass overflow-hidden rounded-2xl transition-opacity ${hasPlayed ? '' : 'opacity-40'}`}>
                    <div className="relative h-24 sm:h-32 w-full bg-slate-200 dark:bg-gray-700">
                      <img
                        src={`/games/${game.id}/cover.png`}
                        alt={game.name}
                        className="h-full w-full object-cover"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                      />
                      {!hasPlayed && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <span className="text-xs font-medium text-white/80">Not played</span>
                        </div>
                      )}
                    </div>
                    <div className="p-2.5 sm:p-4">
                      <h4 className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm leading-tight truncate">{game.name}</h4>
                      <div className="mt-2 grid grid-cols-2 gap-1.5 sm:gap-3">
                        <div className="bg-slate-100 dark:bg-gray-700/60 rounded-lg sm:rounded-xl px-2 sm:px-3 py-1.5 sm:py-2">
                          <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-gray-400">Score</p>
                          <p className={`mt-0.5 text-sm sm:text-lg font-bold leading-tight ${hasPlayed ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-gray-600'}`}>
                            {gameScore !== undefined ? gameScore.toLocaleString() : '—'}
                          </p>
                        </div>
                        <div className="bg-slate-100 dark:bg-gray-700/60 rounded-lg sm:rounded-xl px-2 sm:px-3 py-1.5 sm:py-2">
                          <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-gray-400">Matches</p>
                          <p className={`mt-0.5 text-sm sm:text-lg font-bold leading-tight ${matchCount > 0 ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-gray-600'}`}>
                            {matchCount > 0 ? matchCount.toLocaleString() : '—'}
                          </p>
                        </div>
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
