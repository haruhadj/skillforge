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
import { UserProfile } from '@/app/types'
import AvatarEditor, { buildResizedAvatarBlob, readImageDimensions, createInitialEditorState, AVATAR_EXPORT_SIZE, AVATAR_THUMB_SIZE } from './AvatarEditor'

export default function ProfilePage() {
  const router = useRouter()
  const { currentUser } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [usernameInput, setUsernameInput] = useState('')
  const [savingUsername, setSavingUsername] = useState(false)
  const [scores, setScores] = useState<Record<string, { bestScore: number }>>({})
  const [gameStats, setGameStats] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(true)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoEditor, setPhotoEditor] = useState<ReturnType<typeof createInitialEditorState> | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)

  // Protect route
  useEffect(() => {
    if (!currentUser && typeof window !== 'undefined') {
      router.push('/')
    }
  }, [currentUser, router])

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
      .then(([loadedProfile, loadedScores, loadedGameStats]) => {
        setProfile(loadedProfile)
        setUsernameInput(loadedProfile?.username || suggested)
        setScores(loadedScores)
        setGameStats(loadedGameStats)
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

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {defaultGames.map((game) => {
                const gameScore = scores[game.id]?.bestScore
                const stats = gameStats[game.id] as Record<string, number> | undefined
                const matchCount = stats?.totalMatchCount || stats?.matchCount || 0

                return (
                  <div key={game.id} className="glass p-4">
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
    </div>
  )
}
