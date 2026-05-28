'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { useAuth } from '@/app/contexts/AuthContext'
import ThemeToggle from '@/app/components/ThemeToggle'
import * as gameDataService from '@/app/services/gameDataService'
import {
  claimUsername,
  createSuggestedUsername,
  getUserProfile,
  isValidUsername,
  resolveAuthProvider,
  uploadProfilePhoto,
} from '@/app/services/userProfileService'
import { defaultGames } from '@/app/games/games'
import { UserProfile, GlobalLeaderboardEntry } from '@/app/types'
import AvatarEditor, { buildResizedAvatarBlob, readImageDimensions, createInitialEditorState, AVATAR_EXPORT_SIZE, AVATAR_THUMB_SIZE } from './AvatarEditor'

export default function ProfilePage() {
  const router = useRouter()
  const { currentUser, logout } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [usernameInput, setUsernameInput] = useState('')
  const [savingUsername, setSavingUsername] = useState(false)
  const [scores, setScores] = useState<Record<string, { bestScore: number; bestScoreAchievedAt?: Date; updatedAt?: Date }>>({})
  const [gameStats, setGameStats] = useState<Record<string, unknown>>({})
  const [globalStats, setGlobalStats] = useState<GlobalLeaderboardEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoEditor, setPhotoEditor] = useState<ReturnType<typeof createInitialEditorState> | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [statSort, setStatSort] = useState<'name' | 'score' | 'matches' | 'played'>('played')

  // Protect route
  useEffect(() => {
    if (!currentUser && typeof window !== 'undefined') {
      router.push('/')
    }
  }, [currentUser, router])

  const handleDeleteAccount = async () => {
    if (!currentUser) return

    try {
      setDeletingAccount(true)
      
      // Get fresh ID token
      const token = await currentUser.getIdToken(true)
      
      const response = await fetch('/api/user/delete-account', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete account')
      }

      await logout()
      toast.success('Your account has been deleted')
      router.push('/')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete account')
      setDeletingAccount(false)
      setShowDeleteConfirm(false)
    }
  }

  // Cleanup photo editor on unmount
  useEffect(() => {
    return () => {
      if (photoEditor?.imageUrl) {
        URL.revokeObjectURL(photoEditor.imageUrl)
      }
    }
  }, [photoEditor?.imageUrl])

  useEffect(() => {
    if (!currentUser) {
      return
    }

    setLoading(true)

    const suggested = createSuggestedUsername(
      currentUser.displayName || currentUser.email?.split('@')[0] || '',
    )

    Promise.all([
      getUserProfile(currentUser.uid),
      gameDataService.getAllScores(currentUser.uid),
      gameDataService.getAllGameStats(currentUser.uid),
    ])
      .then(async ([loadedProfile, loadedScores, loadedGameStats]) => {
        setProfile(loadedProfile)
        setUsernameInput(loadedProfile?.username || suggested)
        setScores(loadedScores)
        setGameStats(loadedGameStats)
        
        // Calculate accurate global stats with proper normalization
        if (currentUser && Object.keys(loadedScores).length > 0) {
          const stats = await gameDataService.getUserGlobalStats(
            currentUser.uid,
            loadedScores,
            loadedGameStats as Record<string, { totalMatchCount?: number }>
          )
          setGlobalStats(stats)
        }
      })
      .catch((fetchError: Error) => {
        toast.error(`Failed to load profile: ${fetchError.message}`)
      })
      .finally(() => setLoading(false))
  }, [currentUser])

  const handleUsernameSave = async () => {
    if (!currentUser) return

    const trimmed = usernameInput.trim()
    if (!isValidUsername(trimmed)) {
      toast.error('Username must be 3-20 characters and use letters, numbers, or underscores only')
      return
    }

    try {
      setSavingUsername(true)
      const result = await claimUsername(currentUser.uid, trimmed, {
        email: currentUser.email,
        authProvider: resolveAuthProvider(currentUser),
      })
      setProfile((prev) => prev ? { ...prev, username: result.username, usernameNormalized: result.usernameNormalized } : null)
      toast.success('Username updated')
    } catch (error) {
      toast.error(`Failed to update username: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setSavingUsername(false)
    }
  }

  const name = profile?.username || currentUser?.displayName || currentUser?.email || 'Player'
  const initials = name.slice(0, 2).toUpperCase()
  const photoURL = profile?.photoThumbURL || profile?.photoURL || currentUser?.photoURL


  const handlePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file || !currentUser) return

    try {
      const { imageUrl, width, height } = await readImageDimensions(file)
      setPhotoEditor(createInitialEditorState(file, imageUrl, width, height))
    } catch (photoError) {
      toast.error(photoError instanceof Error ? photoError.message : 'Failed to load image')
    }
  }

  const closePhotoEditor = () => {
    if (photoEditor?.imageUrl) {
      URL.revokeObjectURL(photoEditor.imageUrl)
    }
    setPhotoEditor(null)
  }

  const handlePhotoUploadConfirm = async () => {
    if (!photoEditor || !currentUser) return

    try {
      setUploadingPhoto(true)
      const [mainFile, thumbFile] = await Promise.all([
        buildResizedAvatarBlob(photoEditor, AVATAR_EXPORT_SIZE),
        buildResizedAvatarBlob(photoEditor, AVATAR_THUMB_SIZE),
      ])
      const uploadedPhoto = await uploadProfilePhoto(currentUser.uid, { mainFile, thumbFile })

      setProfile((prev) => prev ? {
        ...prev,
        photoURL: uploadedPhoto.photoURL,
        photoThumbURL: uploadedPhoto.photoThumbURL,
      } : null)
      closePhotoEditor()
      toast.success('Profile picture updated')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload photo')
    } finally {
      setUploadingPhoto(false)
    }
  }

  if (!currentUser) {
    return null
  }

  return (
    <div className="min-h-screen gradient-bg transition-colors duration-500">
      <header className="sticky top-0 z-10 glass border-b border-slate-200/50 dark:border-gray-700/50">
        <div className="mx-auto max-w-4xl px-6 py-4 flex items-center gap-3">
          <Link
            href="/library"
            className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.56l3.47 3.47a.75.75 0 11-1.06 1.06l-4.75-4.75a.75.75 0 010-1.06l4.75-4.75a.75.75 0 011.06 1.06L5.56 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
            </svg>
            Back
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white flex-1 text-center tracking-tight">My Profile</h1>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {loading ? (
          <div className="glass p-8 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-slate-600 dark:text-gray-400">Loading profile...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Profile Card */}
            <div className="glass p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <button
                  onClick={() => photoInputRef.current?.click()}
                  className="relative h-24 w-24 rounded-full bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center text-white text-2xl font-bold overflow-hidden group cursor-pointer hover:ring-4 hover:ring-indigo-200 dark:hover:ring-indigo-800 transition-all"
                >
                  {photoURL ? (
                    <img src={photoURL} alt={name} className="h-full w-full object-cover" />
                  ) : (
                    initials
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </div>
                </button>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
                <div className="text-center sm:text-left flex-1">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{name}</h2>
                  <p className="text-slate-600 dark:text-gray-400">{currentUser.email}</p>
                  {globalStats && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${
                        globalStats.tier === 'master' ? 'bg-purple-600 text-white' :
                        globalStats.tier === 'platinum' ? 'bg-cyan-500 text-white' :
                        globalStats.tier === 'gold' ? 'bg-yellow-500 text-white' :
                        globalStats.tier === 'silver' ? 'bg-slate-400 text-white' :
                        'bg-amber-700 text-white'
                      }`}>
                        {globalStats.tier.charAt(0).toUpperCase() + globalStats.tier.slice(1)}
                      </span>
                      <span className="text-sm text-slate-600 dark:text-gray-400">
                        Skill Score: <span className="font-semibold text-indigo-600 dark:text-indigo-400">{globalStats.compositeScore}</span>
                      </span>
                      <span className="text-xs text-slate-500 dark:text-gray-500">
                        ({globalStats.gamesPlayed} games • {globalStats.totalMatchCount.toLocaleString()} matches)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Username Editor */}
            <div className="glass p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Username</h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700/50 px-4 py-2.5 text-slate-900 dark:text-gray-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200/50"
                  placeholder="Enter username"
                />
                <button
                  onClick={handleUsernameSave}
                  disabled={savingUsername}
                  className="btn-primary px-6"
                >
                  {savingUsername ? 'Saving...' : 'Save'}
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-gray-400">
                3-20 characters, letters, numbers, and underscores only
              </p>
            </div>

            {/* Account Deletion */}
            <div className="glass p-6 border-red-200 dark:border-red-900/30">
              <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-4">Danger Zone</h3>
              <p className="text-sm text-slate-600 dark:text-gray-400 mb-4">
                Deleting your account will permanently remove all your data, including scores, stats, and profile information. This action cannot be undone.
              </p>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-medium text-sm"
              >
                Delete My Account
              </button>
            </div>

            {/* Stats Grid */}
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
                // 'played': played games first, then alphabetical within each group
                if (aPlayed !== bPlayed) return aPlayed ? -1 : 1
                return a.name.localeCompare(b.name)
              }).map((game) => {
                const gameScore = scores[game.id]?.bestScore
                const stats = gameStats[game.id] as Record<string, unknown> | undefined
                const historyLength = Array.isArray(stats?.history) ? (stats.history as unknown[]).length : 0
                const matchCount = (stats?.totalMatchCount as number) || (stats?.matchCount as number) || (stats?.totalGames as number) || historyLength || 0
                const hasPlayed = gameScore !== undefined || matchCount > 0

                const scoreData = scores[game.id]
                const achievedAt = scoreData?.bestScoreAchievedAt || scoreData?.updatedAt

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
                          {achievedAt && (
                            <p className="text-[9px] text-slate-400 dark:text-gray-500 mt-0.5">
                              {achievedAt.toLocaleDateString()}
                            </p>
                          )}
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
        )}
      </main>

      {photoEditor && (
        <AvatarEditor
          editorState={photoEditor}
          onChange={setPhotoEditor}
          onClose={closePhotoEditor}
          onConfirm={handlePhotoUploadConfirm}
          uploading={uploadingPhoto}
        />
      )}

      {/* Delete Account Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-red-200 dark:border-red-900/50 bg-white dark:bg-gray-900 p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30">
                <svg className="h-6 w-6 text-red-600 dark:text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.19-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Delete Account?</h3>
            </div>

            <div className="space-y-3 text-sm text-slate-600 dark:text-gray-400">
              <p className="font-medium text-red-600 dark:text-red-400">
                Warning: This action is permanent and cannot be reversed!
              </p>
              <p>All of the following will be permanently deleted:</p>
              <ul className="list-disc list-inside pl-2 space-y-1">
                <li>Your user profile and username</li>
                <li>All game scores and statistics</li>
                <li>Your progress and achievements</li>
                <li>Your account authentication data</li>
              </ul>
              <p className="text-slate-500 dark:text-gray-500 italic">
                If you change your mind, click Cancel now.
              </p>
            </div>

            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deletingAccount}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-gray-600 text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors font-medium text-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deletingAccount}
                className="px-4 py-2 rounded-lg bg-red-600 dark:bg-red-700 text-white hover:bg-red-700 dark:hover:bg-red-600 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingAccount ? 'Deleting...' : 'Yes, Delete My Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
