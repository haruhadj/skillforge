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
import { reauthenticateWithCredential, EmailAuthProvider, updatePassword } from 'firebase/auth'
import { defaultGames } from '@/app/games/games'
import { UserProfile, GlobalLeaderboardEntry } from '@/app/types'
import AvatarEditor, { buildResizedAvatarBlob, readImageDimensions, createInitialEditorState, AVATAR_EXPORT_SIZE, AVATAR_THUMB_SIZE } from './AvatarEditor'
import ConnectedAccounts from './ConnectedAccounts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const TIER_CONFIG = {
  master: 'bg-violet-600 text-white',
  platinum: 'bg-cyan-500 text-white',
  gold: 'bg-yellow-500 text-white',
  silver: 'bg-slate-400 text-white',
  bronze: 'bg-amber-700 text-white',
}

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
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [savingPw, setSavingPw] = useState(false)

  useEffect(() => {
    if (!currentUser && typeof window !== 'undefined') router.push('/')
  }, [currentUser, router])

  useEffect(() => {
    return () => { if (photoEditor?.imageUrl) URL.revokeObjectURL(photoEditor.imageUrl) }
  }, [photoEditor?.imageUrl])

  useEffect(() => {
    if (!currentUser) return
    setLoading(true)
    const suggested = createSuggestedUsername(currentUser.displayName || currentUser.email?.split('@')[0] || '')
    Promise.all([
      getUserProfile(currentUser.uid),
      gameDataService.getAllScores(currentUser.uid),
      gameDataService.getAllGameStats(currentUser.uid),
    ]).then(async ([loadedProfile, loadedScores, loadedGameStats]) => {
      setProfile(loadedProfile)
      setUsernameInput(loadedProfile?.username || suggested)
      setScores(loadedScores)
      setGameStats(loadedGameStats)
      if (currentUser && Object.keys(loadedScores).length > 0) {
        const stats = await gameDataService.getUserGlobalStats(
          currentUser.uid, loadedScores,
          loadedGameStats as Record<string, { totalMatchCount?: number }>
        )
        setGlobalStats(stats)
      }
    }).catch((e: Error) => toast.error(`Failed to load profile: ${e.message}`))
    .finally(() => setLoading(false))
  }, [currentUser])

  const handleUsernameSave = async () => {
    if (!currentUser) return
    const trimmed = usernameInput.trim()
    if (!isValidUsername(trimmed)) {
      toast.error('Username must be 3-20 characters, letters/numbers/underscores only')
      return
    }
    try {
      setSavingUsername(true)
      const result = await claimUsername(currentUser.uid, trimmed, {
        email: currentUser.email,
        authProvider: resolveAuthProvider(currentUser),
      })
      setProfile((p) => p ? { ...p, username: result.username, usernameNormalized: result.usernameNormalized } : null)
      toast.success('Username updated')
    } catch (e) {
      toast.error(`Failed: ${e instanceof Error ? e.message : 'Unknown error'}`)
    } finally {
      setSavingUsername(false)
    }
  }

  const handlePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !currentUser) return
    try {
      const { imageUrl, width, height } = await readImageDimensions(file)
      setPhotoEditor(createInitialEditorState(file, imageUrl, width, height))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load image')
    }
  }

  const closePhotoEditor = () => {
    if (photoEditor?.imageUrl) URL.revokeObjectURL(photoEditor.imageUrl)
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
      const uploaded = await uploadProfilePhoto(currentUser.uid, { mainFile, thumbFile })
      setProfile((p) => p ? { ...p, photoURL: uploaded.photoURL, photoThumbURL: uploaded.photoThumbURL } : null)
      closePhotoEditor()
      toast.success('Profile picture updated')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to upload photo')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!currentUser) return
    try {
      setDeletingAccount(true)
      const token = await currentUser.getIdToken(true)
      const res = await fetch('/api/user/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed') }
      await logout()
      toast.success('Account deleted')
      router.push('/')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete account')
      setDeletingAccount(false)
      setShowDeleteConfirm(false)
    }
  }

  const handleChangePassword = async () => {
    if (!currentUser?.email) return
    if (!pwForm.current) { toast.error('Enter your current password'); return }
    if (pwForm.next.length < 6) { toast.error('New password must be at least 6 characters'); return }
    if (pwForm.next !== pwForm.confirm) { toast.error('Passwords do not match'); return }
    try {
      setSavingPw(true)
      const credential = EmailAuthProvider.credential(currentUser.email, pwForm.current)
      await reauthenticateWithCredential(currentUser, credential)
      await updatePassword(currentUser, pwForm.next)
      setPwForm({ current: '', next: '', confirm: '' })
      toast.success('Password changed')
    } catch (e: unknown) {
      const code = (e as { code?: string }).code
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        toast.error('Current password is incorrect')
      } else {
        toast.error(e instanceof Error ? e.message : 'Failed to change password')
      }
    } finally {
      setSavingPw(false)
    }
  }

  const name = profile?.username || currentUser?.displayName || currentUser?.email || 'Player'
  const initials = name.slice(0, 2).toUpperCase()
  const photoURL = profile?.photoThumbURL || profile?.photoURL || currentUser?.photoURL

  if (!currentUser) return null

  return (
    <div className="min-h-screen gradient-bg">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 h-14 flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground -ml-2">
            <Link href="/library">
              <svg className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.56l3.47 3.47a.75.75 0 11-1.06 1.06l-4.75-4.75a.75.75 0 010-1.06l4.75-4.75a.75.75 0 011.06 1.06L5.56 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
              </svg>
              Back
            </Link>
          </Button>
          <h1 className="text-lg font-bold flex-1 text-center">My Profile</h1>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-5">
        {loading ? (
          <div className="surface p-8">
            <div className="flex items-center gap-6">
              <Skeleton className="h-20 w-20 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-56" />
                <Skeleton className="h-6 w-24" />
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Profile card */}
            <div className="surface p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                {/* Avatar */}
                <button
                  onClick={() => photoInputRef.current?.click()}
                  className="relative h-20 w-20 sm:h-24 sm:w-24 rounded-full overflow-hidden group cursor-pointer shrink-0 ring-2 ring-border hover:ring-primary/50 transition-all"
                >
                  {photoURL ? (
                    <img src={photoURL} alt={name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold">{initials}</div>
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </div>
                </button>
                <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handlePhotoChange} className="hidden" />

                <div className="text-center sm:text-left flex-1 min-w-0">
                  <h2 className="text-xl font-bold">{name}</h2>
                  <p className="text-sm text-muted-foreground">{currentUser.email}</p>
                  {globalStats && (
                    <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${TIER_CONFIG[globalStats.tier]}`}>
                        {globalStats.tier.charAt(0).toUpperCase() + globalStats.tier.slice(1)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        Skill Score: <span className="font-semibold text-primary">{globalStats.compositeScore}</span>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {globalStats.gamesPlayed} games · {globalStats.totalMatchCount.toLocaleString()} matches
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Username */}
            <div className="surface p-6">
              <h3 className="text-base font-semibold mb-4">Username</h3>
              <div className="flex gap-3">
                <Input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="Enter username"
                  className="flex-1 h-10"
                />
                <Button onClick={handleUsernameSave} disabled={savingUsername} className="h-10 px-5">
                  {savingUsername ? 'Saving…' : 'Save'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">3–20 characters, letters, numbers, underscores only</p>
            </div>

            {/* Change password — only for email/password accounts */}
            {resolveAuthProvider(currentUser) === 'password' && (
              <div className="surface p-6">
                <h3 className="text-base font-semibold mb-4">Change Password</h3>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="pw-current" className="text-sm">Current password</Label>
                    <Input
                      id="pw-current"
                      type="password"
                      autoComplete="current-password"
                      value={pwForm.current}
                      onChange={(e) => setPwForm((f) => ({ ...f, current: e.target.value }))}
                      className="h-10"
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pw-new" className="text-sm">New password</Label>
                    <Input
                      id="pw-new"
                      type="password"
                      autoComplete="new-password"
                      value={pwForm.next}
                      onChange={(e) => setPwForm((f) => ({ ...f, next: e.target.value }))}
                      className="h-10"
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pw-confirm" className="text-sm">Confirm new password</Label>
                    <Input
                      id="pw-confirm"
                      type="password"
                      autoComplete="new-password"
                      value={pwForm.confirm}
                      onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))}
                      className="h-10"
                      placeholder="••••••••"
                    />
                  </div>
                  <Button onClick={handleChangePassword} disabled={savingPw} className="h-10 px-5 mt-1">
                    {savingPw ? 'Saving…' : 'Update Password'}
                  </Button>
                </div>
              </div>
            )}

            {/* Connected accounts */}
            <ConnectedAccounts user={currentUser} profile={profile} onProfileChange={setProfile} />

            {/* Game stats */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-base font-semibold">Game Stats</h3>
                <div className="flex gap-1.5 ml-auto">
                  {(['played', 'score', 'matches', 'name'] as const).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setStatSort(opt)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                        statSort === opt ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {opt === 'played' ? 'Played' : opt === 'score' ? 'Score' : opt === 'matches' ? 'Matches' : 'A–Z'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {[...defaultGames].sort((a, b) => {
                  const aScore = scores[a.id]?.bestScore ?? -1
                  const bScore = scores[b.id]?.bestScore ?? -1
                  const aStats = gameStats[a.id] as Record<string, unknown> | undefined
                  const bStats = gameStats[b.id] as Record<string, unknown> | undefined
                  const aMatches = (aStats?.totalMatchCount as number) || (aStats?.matchCount as number) || (aStats?.totalGames as number) || (Array.isArray(aStats?.history) ? (aStats.history as unknown[]).length : 0) || 0
                  const bMatches = (bStats?.totalMatchCount as number) || (bStats?.matchCount as number) || (bStats?.totalGames as number) || (Array.isArray(bStats?.history) ? (bStats.history as unknown[]).length : 0) || 0
                  if (statSort === 'score') return bScore - aScore
                  if (statSort === 'matches') return bMatches - aMatches
                  if (statSort === 'name') return a.name.localeCompare(b.name)
                  const aPlayed = aScore >= 0 || aMatches > 0
                  const bPlayed = bScore >= 0 || bMatches > 0
                  if (aPlayed !== bPlayed) return aPlayed ? -1 : 1
                  return a.name.localeCompare(b.name)
                }).map((game) => {
                  const gameScore = scores[game.id]?.bestScore
                  const stats = gameStats[game.id] as Record<string, unknown> | undefined
                  const histLen = Array.isArray(stats?.history) ? (stats.history as unknown[]).length : 0
                  const matchCount = (stats?.totalMatchCount as number) || (stats?.matchCount as number) || (stats?.totalGames as number) || histLen || 0
                  const hasPlayed = gameScore !== undefined || matchCount > 0
                  const achievedAt = scores[game.id]?.bestScoreAchievedAt || scores[game.id]?.updatedAt

                  return (
                    <div key={game.id} className={`surface overflow-hidden transition-opacity ${hasPlayed ? '' : 'opacity-40'}`}>
                      <div className="relative aspect-video bg-muted">
                        <img
                          src={`/games/${game.id}/cover.png`}
                          alt={game.name}
                          className="h-full w-full object-cover"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                        />
                        {!hasPlayed && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                            <span className="text-xs text-white/80 font-medium">Not played</span>
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <h4 className="text-xs font-semibold truncate mb-2">{game.name}</h4>
                        <div className="grid grid-cols-2 gap-1.5">
                          <div className="bg-muted rounded-lg px-2.5 py-2">
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Score</p>
                            <p className={`text-sm font-bold mt-0.5 ${hasPlayed ? 'text-primary' : 'text-muted-foreground'}`}>
                              {gameScore !== undefined ? gameScore.toLocaleString() : '—'}
                            </p>
                            {achievedAt && (
                              <p className="text-[9px] text-muted-foreground">{achievedAt.toLocaleDateString()}</p>
                            )}
                          </div>
                          <div className="bg-muted rounded-lg px-2.5 py-2">
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Matches</p>
                            <p className={`text-sm font-bold mt-0.5 ${matchCount > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
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

            <Separator />

            {/* Danger zone */}
            <div className="surface p-6 border-destructive/20">
              <h3 className="text-base font-semibold text-destructive mb-2">Danger Zone</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Permanently delete your account and all associated data. This cannot be undone.
              </p>
              <Button variant="outline" size="sm" className="border-destructive/40 text-destructive hover:bg-destructive/5" onClick={() => setShowDeleteConfirm(true)}>
                Delete My Account
              </Button>
            </div>
          </>
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

      {/* Delete account dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={(open) => !deletingAccount && setShowDeleteConfirm(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Account?</DialogTitle>
            <DialogDescription>
              This action is permanent and cannot be reversed. All your data will be deleted including scores, stats, and profile information.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={deletingAccount}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteAccount} disabled={deletingAccount}>
              {deletingAccount ? 'Deleting…' : 'Yes, Delete My Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
