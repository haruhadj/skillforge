import { useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/useAuth'
import * as gameDataService from '../services/gameDataService'
import {
  claimUsername,
  createSuggestedUsername,
  getUserProfile,
  isValidUsername,
  resolveAuthProvider,
  uploadProfilePhoto,
} from '../services/userProfileService'
import { games } from '../games/games'
import ThemeToggle from './ThemeToggle'

const AVATAR_EDITOR_SIZE = 240
const AVATAR_EXPORT_SIZE = 512
const AVATAR_THUMB_SIZE = 160

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function readImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const imageUrl = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => {
      resolve({
        imageUrl,
        width: image.naturalWidth,
        height: image.naturalHeight,
      })
    }

    image.onerror = () => {
      URL.revokeObjectURL(imageUrl)
      reject(new Error('Could not load that image. Please try another file.'))
    }

    image.src = imageUrl
  })
}

function getRotationDimensions(imageWidth, imageHeight, rotation) {
  if (rotation % 180 === 0) {
    return { width: imageWidth, height: imageHeight }
  }

  return { width: imageHeight, height: imageWidth }
}

function getMinScale(imageWidth, imageHeight, rotation = 0) {
  const rotated = getRotationDimensions(imageWidth, imageHeight, rotation)

  return Math.max(AVATAR_EDITOR_SIZE / rotated.width, AVATAR_EDITOR_SIZE / rotated.height)
}

function clampPosition(position, imageWidth, imageHeight, scale, rotation = 0) {
  const rotated = getRotationDimensions(imageWidth, imageHeight, rotation)
  const scaledWidth = rotated.width * scale
  const scaledHeight = rotated.height * scale
  const maxX = Math.max(0, (scaledWidth - AVATAR_EDITOR_SIZE) / 2)
  const maxY = Math.max(0, (scaledHeight - AVATAR_EDITOR_SIZE) / 2)

  return {
    x: clamp(position.x, -maxX, maxX),
    y: clamp(position.y, -maxY, maxY),
  }
}

function loadEditorImage(imageUrl) {
  return new Promise((resolve, reject) => {
    const nextImage = new Image()
    nextImage.onload = () => resolve(nextImage)
    nextImage.onerror = () => reject(new Error('Could not prepare the resized image.'))
    nextImage.src = imageUrl
  })
}

async function buildResizedAvatarBlob(editorState, outputSize) {
  const canvas = document.createElement('canvas')
  canvas.width = outputSize
  canvas.height = outputSize

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Image editing is not available in this browser.')
  }

  const image = await loadEditorImage(editorState.imageUrl)
  const exportRatio = outputSize / AVATAR_EDITOR_SIZE

  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, outputSize, outputSize)
  context.translate(
    outputSize / 2 + editorState.position.x * exportRatio,
    outputSize / 2 + editorState.position.y * exportRatio,
  )
  context.rotate((editorState.rotation * Math.PI) / 180)
  context.scale(editorState.scale * exportRatio, editorState.scale * exportRatio)
  context.drawImage(
    image,
    -editorState.width / 2,
    -editorState.height / 2,
    editorState.width,
    editorState.height,
  )

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((result) => {
      if (!result) {
        reject(new Error('Could not export the resized image.'))
        return
      }

      resolve(result)
    }, 'image/jpeg', 0.9)
  })

  return new File([blob], 'profile-photo.jpg', { type: 'image/jpeg' })
}

export default function ProfilePage({ onBack }) {
  const { currentUser } = useAuth()
  const [profile, setProfile] = useState(null)
  const [usernameInput, setUsernameInput] = useState('')
  const [savingUsername, setSavingUsername] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoURL, setPhotoURL] = useState(null)
  const [photoThumbURL, setPhotoThumbURL] = useState(null)
  const photoInputRef = useRef(null)
  const [photoEditor, setPhotoEditor] = useState(null)
  const dragStateRef = useRef(null)

  const [scores, setScores] = useState({})
  const [gameStats, setGameStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

    const loadAllGameStats = gameDataService.getAllGameStats
      ? gameDataService.getAllGameStats(currentUser.uid)
      : Promise.resolve({})

    Promise.all([
      getUserProfile(currentUser.uid),
      gameDataService.getAllScores(currentUser.uid),
      loadAllGameStats,
    ])
      .then(([loadedProfile, loadedScores, loadedGameStats]) => {
        setProfile(loadedProfile)
        setUsernameInput(loadedProfile?.username || suggested)
        setPhotoURL(loadedProfile?.photoURL || currentUser.photoURL || null)
        setPhotoThumbURL(
          loadedProfile?.photoThumbURL || loadedProfile?.photoURL || currentUser.photoURL || null,
        )
        setScores(loadedScores)
        setGameStats(loadedGameStats)
        setError('')
      })
      .catch((fetchError) => {
        setError('Could not load your profile right now.')
        toast.error(`Failed to load profile: ${fetchError.message}`)
      })
      .finally(() => setLoading(false))
  }, [currentUser])

  const closePhotoEditor = () => {
    setPhotoEditor((previous) => {
      if (previous?.imageUrl) {
        URL.revokeObjectURL(previous.imageUrl)
      }

      return null
    })
  }

  const handlePhotoChange = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file || !currentUser) {
      return
    }

    try {
      const { imageUrl, width, height } = await readImageDimensions(file)
      const rotation = 0
      const minScale = getMinScale(width, height, rotation)

      setPhotoEditor((previous) => {
        if (previous?.imageUrl) {
          URL.revokeObjectURL(previous.imageUrl)
        }

        return {
          file,
          imageUrl,
          width,
          height,
          rotation,
          minScale,
          scale: minScale,
          position: { x: 0, y: 0 },
        }
      })
    } catch (photoError) {
      toast.error(photoError.message)
    }
  }

  const handleEditorScaleChange = (event) => {
    const nextScale = Number(event.target.value)

    setPhotoEditor((previous) => {
      if (!previous) {
        return previous
      }

      return {
        ...previous,
        scale: nextScale,
        position: clampPosition(
          previous.position,
          previous.width,
          previous.height,
          nextScale,
          previous.rotation,
        ),
      }
    })
  }

  const handleRotatePhoto = () => {
    setPhotoEditor((previous) => {
      if (!previous) {
        return previous
      }

      const rotation = (previous.rotation + 90) % 360
      const minScale = getMinScale(previous.width, previous.height, rotation)
      const scale = Math.max(previous.scale, minScale)

      return {
        ...previous,
        rotation,
        minScale,
        scale,
        position: clampPosition(previous.position, previous.width, previous.height, scale, rotation),
      }
    })
  }

  const handleEditorPointerDown = (event) => {
    if (!photoEditor || uploadingPhoto) {
      return
    }

    event.currentTarget.setPointerCapture(event.pointerId)
    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      position: photoEditor.position,
    }
  }

  const handleEditorPointerMove = (event) => {
    if (!photoEditor || !dragStateRef.current || dragStateRef.current.pointerId !== event.pointerId) {
      return
    }

    const deltaX = event.clientX - dragStateRef.current.startX
    const deltaY = event.clientY - dragStateRef.current.startY

    setPhotoEditor((previous) => {
      if (!previous) {
        return previous
      }

      return {
        ...previous,
        position: clampPosition(
          {
            x: dragStateRef.current.position.x + deltaX,
            y: dragStateRef.current.position.y + deltaY,
          },
          previous.width,
          previous.height,
          previous.scale,
          previous.rotation,
        ),
      }
    })
  }

  const handleEditorPointerUp = (event) => {
    if (!dragStateRef.current || dragStateRef.current.pointerId !== event.pointerId) {
      return
    }

    event.currentTarget.releasePointerCapture(event.pointerId)
    dragStateRef.current = null
  }

  const handlePhotoUploadConfirm = async () => {
    if (!photoEditor || !currentUser) {
      return
    }

    try {
      setUploadingPhoto(true)
      const [mainFile, thumbFile] = await Promise.all([
        buildResizedAvatarBlob(photoEditor, AVATAR_EXPORT_SIZE),
        buildResizedAvatarBlob(photoEditor, AVATAR_THUMB_SIZE),
      ])
      const uploadedPhoto = await uploadProfilePhoto(currentUser.uid, { mainFile, thumbFile })

      setPhotoURL(uploadedPhoto.photoURL)
      setPhotoThumbURL(uploadedPhoto.photoThumbURL)
      setProfile((previous) => ({
        ...(previous || {}),
        photoURL: uploadedPhoto.photoURL,
        photoThumbURL: uploadedPhoto.photoThumbURL,
      }))
      closePhotoEditor()
      toast.success('Profile picture updated')
    } catch (photoError) {
      toast.error(photoError.message)
    } finally {
      setUploadingPhoto(false)
    }
  }

  const avatarInitials = useMemo(() => {
    const name = profile?.username || currentUser?.displayName || currentUser?.email || ''
    return name.slice(0, 2).toUpperCase()
  }, [profile?.username, currentUser?.displayName, currentUser?.email])

  const scaleLabel = useMemo(() => {
    if (!photoEditor) {
      return '100%'
    }

    return `${Math.round((photoEditor.scale / photoEditor.minScale) * 100)}%`
  }, [photoEditor])

  const trimmedUsername = usernameInput.trim()
  const usernameLooksValid = isValidUsername(trimmedUsername)

  const canSaveUsername = useMemo(() => {
    if (!currentUser || !trimmedUsername || !usernameLooksValid || savingUsername) {
      return false
    }

    return profile?.username !== trimmedUsername
  }, [currentUser, profile?.username, savingUsername, trimmedUsername, usernameLooksValid])

  const handleSaveUsername = async () => {
    if (!currentUser) {
      return
    }

    if (!usernameLooksValid) {
      toast.error('Username must be 3-20 characters and use letters, numbers, or underscores only')
      return
    }

    try {
      setSavingUsername(true)
      const updatedUsername = await claimUsername(
        currentUser.uid,
        trimmedUsername,
        {
          email: currentUser.email || null,
          authProvider: resolveAuthProvider(currentUser),
        },
      )

      setProfile((previousProfile) => ({
        ...(previousProfile || {}),
        ...updatedUsername,
        email: currentUser.email || null,
        authProvider: resolveAuthProvider(currentUser),
      }))
      toast.success('Username updated successfully')
    } catch (saveError) {
      toast.error(`Could not update username: ${saveError.message}`)
    } finally {
      setSavingUsername(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 p-6 transition-colors duration-300">
      {photoEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-3xl border border-slate-200/20 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Adjust profile picture</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">
                  Drag, zoom, and rotate until the circular preview looks right.
                </p>
              </div>
              <button
                type="button"
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                onClick={closePhotoEditor}
                disabled={uploadingPhoto}
              >
                <span className="sr-only">Close image editor</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M4.22 4.22a.75.75 0 011.06 0L10 8.94l4.72-4.72a.75.75 0 111.06 1.06L11.06 10l4.72 4.72a.75.75 0 11-1.06 1.06L10 11.06l-4.72 4.72a.75.75 0 01-1.06-1.06L8.94 10 4.22 5.28a.75.75 0 010-1.06z" />
                </svg>
              </button>
            </div>

            <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start">
              <div className="mx-auto w-full max-w-60 shrink-0">
                <div
                  className="relative h-60 w-60 overflow-hidden rounded-full bg-slate-200 shadow-inner dark:bg-gray-800"
                  onPointerDown={handleEditorPointerDown}
                  onPointerMove={handleEditorPointerMove}
                  onPointerUp={handleEditorPointerUp}
                  onPointerCancel={handleEditorPointerUp}
                >
                  <img
                    src={photoEditor.imageUrl}
                    alt="Profile preview"
                    className="absolute left-1/2 top-1/2 max-w-none select-none touch-none"
                    draggable={false}
                    style={{
                      width: `${photoEditor.width}px`,
                      height: `${photoEditor.height}px`,
                      transform: `translate(-50%, -50%) translate(${photoEditor.position.x}px, ${photoEditor.position.y}px) rotate(${photoEditor.rotation}deg) scale(${photoEditor.scale})`,
                      transformOrigin: 'center',
                    }}
                  />
                  <div className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-inset ring-white/90" />
                  <div className="pointer-events-none absolute inset-2.5 rounded-full border border-dashed border-white/80" />
                </div>
              </div>

              <div className="flex-1">
                <label className="block">
                  <div className="flex items-center justify-between text-sm font-medium text-slate-700 dark:text-gray-300">
                    <span>Zoom</span>
                    <span>{scaleLabel}</span>
                  </div>
                  <input
                    className="mt-3 w-full accent-indigo-600"
                    type="range"
                    min={photoEditor.minScale}
                    max={photoEditor.minScale * 3}
                    step={0.01}
                    value={photoEditor.scale}
                    onChange={handleEditorScaleChange}
                    disabled={uploadingPhoto}
                  />
                </label>

                <button
                  type="button"
                  className="mt-4 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-60 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                  onClick={handleRotatePhoto}
                  disabled={uploadingPhoto}
                >
                  Rotate 90°
                </button>

                <p className="mt-4 text-sm text-slate-500 dark:text-gray-400">
                  The editor saves a full avatar and a smaller thumbnail, both cropped from this circular preview.
                </p>

                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-60 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                    onClick={closePhotoEditor}
                    disabled={uploadingPhoto}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                    onClick={handlePhotoUploadConfirm}
                    disabled={uploadingPhoto}
                  >
                    {uploadingPhoto ? 'Uploading...' : 'Use this photo'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-4xl">
        <header className="flex items-center justify-between gap-3">
          <button
            className="rounded-xl bg-slate-100 dark:bg-gray-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-gray-300 transition-colors duration-200 hover:bg-slate-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-4 focus:ring-slate-200 dark:focus:ring-gray-600"
            onClick={onBack}
          >
            ← Back to library
          </button>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Profile</h2>
          <ThemeToggle />
        </header>

        {!currentUser && (
          <p className="mt-12 text-center text-slate-500 dark:text-gray-400">
            Log in to view your profile.
          </p>
        )}

        {currentUser && (
          <section className="mt-6 rounded-2xl border border-slate-200 dark:border-gray-700/50 bg-white dark:bg-gray-800/80 p-5 shadow-sm dark:shadow-lg dark:shadow-black/20">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Account</h3>

            {/* Avatar */}
            <div className="mt-4 flex items-center gap-4">
              <button
                type="button"
                className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-slate-200 dark:border-gray-600 focus:outline-none focus:ring-4 focus:ring-indigo-200 dark:focus:ring-indigo-800 disabled:opacity-60"
                onClick={() => photoInputRef.current?.click()}
                disabled={uploadingPhoto || Boolean(photoEditor)}
                title="Change profile picture"
              >
                {photoThumbURL ? (
                  <img src={photoThumbURL} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-indigo-100 dark:bg-indigo-900 text-2xl font-bold text-indigo-600 dark:text-indigo-300">
                    {avatarInitials}
                  </span>
                )}
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                  {uploadingPhoto ? (
                    <svg className="h-6 w-6 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                  ) : (
                    <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </span>
              </button>
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-gray-300">Profile picture</p>
                <p className="mt-0.5 text-xs text-slate-400 dark:text-gray-500">
                  JPEG, PNG, WebP or GIF. You can reposition and resize before upload.
                </p>
              </div>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </div>
            <p className="mt-2 text-sm text-slate-500 dark:text-gray-400">
              Signed in as {currentUser.email || 'Unknown email'}
            </p>
            <p className="text-sm text-slate-500 dark:text-gray-400">
              Provider: {profile?.authProvider || resolveAuthProvider(currentUser)}
            </p>

            <div className="mt-4">
              <label className="block">
                <span className="text-sm font-medium text-slate-700 dark:text-gray-300">Username</span>
                <input
                  className="mt-2 w-full rounded-xl border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-slate-900 dark:text-gray-100 shadow-sm focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 transition-colors duration-200 placeholder:text-slate-400 dark:placeholder:text-gray-500"
                  type="text"
                  value={usernameInput}
                  onChange={(event) => setUsernameInput(event.target.value)}
                  spellCheck={false}
                  autoCapitalize="off"
                  autoCorrect="off"
                />
              </label>
              <p className="mt-2 text-xs text-slate-500 dark:text-gray-400">
                Use 3-20 characters: letters, numbers, and underscores only.
              </p>
              {trimmedUsername && !usernameLooksValid && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                  Invalid username format.
                </p>
              )}
              <button
                className="mt-4 rounded-xl bg-indigo-600 dark:bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-indigo-700 dark:hover:bg-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-200 dark:focus:ring-indigo-800 disabled:opacity-60 disabled:cursor-not-allowed"
                onClick={handleSaveUsername}
                disabled={!canSaveUsername}
                type="button"
              >
                {savingUsername ? 'Saving...' : 'Save username'}
              </button>
            </div>
          </section>
        )}

        {loading && currentUser && (
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {games.map((game) => (
              <div
                key={game.id}
                className="rounded-2xl border border-slate-200 dark:border-gray-700/50 bg-white dark:bg-gray-800/80 p-5 shadow-sm dark:shadow-lg dark:shadow-black/20 animate-pulse"
              >
                <div className="h-5 w-32 rounded bg-slate-200 dark:bg-gray-700" />
                <div className="mt-4 h-8 w-24 rounded bg-slate-200 dark:bg-gray-700" />
                <div className="mt-3 h-3 w-40 rounded bg-slate-200 dark:bg-gray-700" />
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <p className="mt-12 text-center text-red-600 dark:text-red-400">{error}</p>
        )}

        {!loading && currentUser && !error && (
          <section className="mt-8">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Your Statistics</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {games.map((game) => {
                const data = scores[game.id]
                const stats = gameStats[game.id]
                return (
                  <div
                    key={game.id}
                    className="rounded-2xl border border-slate-200 dark:border-gray-700/50 bg-white dark:bg-gray-800/80 p-5 shadow-sm dark:shadow-lg dark:shadow-black/20"
                  >
                    <h4 className="text-lg font-semibold text-slate-900 dark:text-white">
                      {game.name}
                    </h4>

                    {data ? (
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-500 dark:text-gray-400">Best Score</span>
                          <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                            {data.bestScore.toLocaleString()}
                          </span>
                        </div>
                        {data.updatedAt && (
                          <p className="text-xs text-slate-400 dark:text-gray-500">
                            Last updated: {data.updatedAt.toDate().toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    ) : stats?.combinedAverageScore != null ? (
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-500 dark:text-gray-400">Overall Average</span>
                          <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                            {Number(stats.combinedAverageScore).toFixed(2)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-gray-400">
                          Weighted by matches ({Number(stats.totalMatchCount || 0)} total)
                        </p>
                        <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                          <div className="rounded-lg bg-slate-100 dark:bg-gray-700/60 px-2 py-1">
                            <div className="text-slate-500 dark:text-gray-400">Singleplayer</div>
                            <div className="font-semibold text-slate-800 dark:text-gray-100">
                              {Number(stats.singleplayer?.averageScore || 0).toFixed(2)}
                            </div>
                            <div className="text-slate-500 dark:text-gray-400">
                              {Number(stats.singleplayer?.matchCount || 0)} matches
                            </div>
                          </div>
                          <div className="rounded-lg bg-slate-100 dark:bg-gray-700/60 px-2 py-1">
                            <div className="text-slate-500 dark:text-gray-400">Multiplayer</div>
                            <div className="font-semibold text-slate-800 dark:text-gray-100">
                              {Number(stats.multiplayer?.averageScore || 0).toFixed(2)}
                            </div>
                            <div className="text-slate-500 dark:text-gray-400">
                              {Number(stats.multiplayer?.matchCount || 0)} matches
                            </div>
                          </div>
                        </div>
                        {stats.updatedAt && (
                          <p className="text-xs text-slate-400 dark:text-gray-500">
                            Last updated: {stats.updatedAt.toDate().toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    ) : stats?.accuracyPercentage != null ? (
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-500 dark:text-gray-400">Accuracy</span>
                          <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                            {stats.accuracyPercentage.toFixed(2)}%
                          </span>
                        </div>
                        {stats.updatedAt && (
                          <p className="text-xs text-slate-400 dark:text-gray-500">
                            Last updated: {stats.updatedAt.toDate().toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-slate-400 dark:text-gray-500">
                        No data yet - play a game!
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
