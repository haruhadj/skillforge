'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { deleteUserData, getAllUsers, setUserRole } from '@/app/services/adminService'
import { useAuth } from '@/app/contexts/AuthContext'
import { getProfileSignInMethods, type SignInMethod } from '@/app/services/userProfileService'
import { UserProfile } from '@/app/types'

// Badge styling per sign-in method, rendered dynamically from each user's profile.
const PROVIDER_BADGE: Record<SignInMethod, { label: string; className: string; icon: React.ReactNode }> = {
  password: {
    label: 'Password',
    className: 'bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-300',
    icon: (
      <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
      </svg>
    ),
  },
  google: {
    label: 'Google',
    className: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    icon: (
      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
      </svg>
    ),
  },
  github: {
    label: 'GitHub',
    className: 'bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-gray-200',
    icon: (
      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.29-.01-1.04-.02-2.05-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6.01 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.62-5.49 5.92.43.37.81 1.1.81 2.22 0 1.61-.01 2.9-.01 3.29 0 .32.21.7.82.58A12 12 0 0 0 24 12.5C24 5.87 18.63.5 12 .5z" />
      </svg>
    ),
  },
  tiktok: {
    label: 'TikTok',
    className: 'bg-slate-100 dark:bg-gray-700 text-slate-900 dark:text-gray-100',
    icon: (
      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
      </svg>
    ),
  },
  twitter: {
    label: 'X',
    className: 'bg-slate-100 dark:bg-gray-700 text-slate-900 dark:text-gray-100',
    icon: (
      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  facebook: {
    label: 'Facebook',
    className: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    icon: (
      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  discord: {
    label: 'Discord',
    className: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400',
    icon: (
      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.317 4.369a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.6 12.6 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.74 19.74 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.891.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
      </svg>
    ),
  },
}

export default function AdminUsersTab() {
  const { currentUser } = useAuth()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [confirmReset, setConfirmReset] = useState<UserProfile | null>(null)
  const [resetting, setResetting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<UserProfile | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadUsers = async () => {
    try {
      setLoading(true)
      const data = await getAllUsers()
      setUsers(data)
    } catch (err) {
      console.error('Admin: Failed to load users', err)
      toast.error(`Failed to load users: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadUsers() }, [])

  const filtered = users.filter((u) => {
    const q = search.toLowerCase()
    return (
      (u.username || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      u.uid.toLowerCase().includes(q)
    )
  })

  const handleToggleRole = async (user: UserProfile) => {
    if (user.uid === currentUser?.uid) {
      toast.error('You cannot change your own role')
      return
    }
    const cycle: Record<string, 'admin' | 'user'> = {
      user: 'admin',
      admin: 'user',
    }
    const newRole = cycle[user.role ?? 'user'] ?? 'admin'
    try {
      await setUserRole(user.uid, newRole)
      toast.success(`${user.username || user.email} is now ${newRole}`)
      await loadUsers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update role')
    }
  }

  const nextRoleLabel = (role: UserProfile['role']) => {
    if (role === 'admin') return 'Demote to User'
    return 'Make Admin'
  }

  const handleResetData = async (uid: string) => {
    try {
      setResetting(true)
      const result = await deleteUserData(uid)
      toast.success(`Deleted ${result.deletedScores} scores and ${result.deletedStats} stat records`)
      setConfirmReset(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reset data')
    } finally {
      setResetting(false)
    }
  }

  const handleDeleteUser = async (uid: string) => {
    try {
      setDeleting(true)
      const token = await currentUser?.getIdToken(true)
      if (!token) throw new Error('Not authenticated')
      const response = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ uid }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete user')
      }

      toast.success(`User deleted (Auth: ${data.authDeleted ? '✓' : '✗'}, Firestore: ${data.firestoreDeleted ? '✓' : '✗'})`)
      setConfirmDelete(null)
      await loadUsers() // Refresh the list
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete user')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">User Management</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">{users.length} registered users</p>
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-gray-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by username, email, or UID..."
          className="w-full rounded-xl border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-800 pl-12 pr-4 py-3 text-slate-900 dark:text-gray-100 shadow-sm focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 transition-colors placeholder:text-slate-400 dark:placeholder:text-gray-500"
        />
      </div>

      {/* Confirm reset modal */}
      {confirmReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-red-200 dark:border-red-800 bg-white dark:bg-gray-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Reset User Data</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-gray-400">
              This will permanently delete all scores and game stats for <strong>{confirmReset.username || confirmReset.email || confirmReset.uid}</strong>. This cannot be undone.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                disabled={resetting}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-200 dark:focus:ring-red-800 disabled:opacity-60"
                onClick={() => handleResetData(confirmReset.uid)}
              >
                {resetting ? 'Deleting...' : 'Delete All Data'}
              </button>
              <button
                type="button"
                className="flex-1 rounded-xl border border-slate-200 dark:border-gray-600 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors"
                onClick={() => setConfirmReset(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete user modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-red-200 dark:border-red-800 bg-white dark:bg-gray-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete User Account</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-gray-400">
              This will permanently delete the user account for <strong>{confirmDelete.username || confirmDelete.email || confirmDelete.uid}</strong>, including all their data, scores, and stats. This cannot be undone.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                disabled={deleting}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-200 dark:focus:ring-red-800 disabled:opacity-60"
                onClick={() => handleDeleteUser(confirmDelete.uid)}
              >
                {deleting ? 'Deleting...' : 'Delete User'}
              </button>
              <button
                type="button"
                className="flex-1 rounded-xl border border-slate-200 dark:border-gray-600 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors"
                onClick={() => setConfirmDelete(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Users list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-20 rounded-xl glass animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400 dark:text-gray-500">
          <p className="text-base font-medium">{search ? 'No users match your search' : 'No users found'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((user) => {
            const isCurrentUser = user.uid === currentUser?.uid
            const initials = (user.username || user.email || '??').slice(0, 2).toUpperCase()

            return (
              <div
                key={user.uid}
                className={`glass p-4 flex flex-col sm:flex-row sm:items-center gap-4 transition-colors ${isCurrentUser ? 'ring-2 ring-indigo-200 dark:ring-indigo-800' : ''}`}
              >
                {/* Avatar */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {user.photoThumbURL || user.photoURL ? (
                    <img src={user.photoThumbURL || user.photoURL} alt="" referrerPolicy="no-referrer" className="h-10 w-10 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                      {initials}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-white truncate">
                      {user.username || 'No username'}
                      {isCurrentUser && <span className="ml-2 text-xs font-normal text-indigo-500 dark:text-indigo-400">(you)</span>}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-gray-400 truncate">{user.email || 'No email'}</p>
                  </div>
                </div>

                {/* Role badge + sign-in methods */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                    user.role === 'admin'
                      ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400'
                      : 'bg-slate-100 dark:bg-gray-800 text-slate-500 dark:text-gray-400'
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${
                      user.role === 'admin' ? 'bg-amber-500' : 'bg-slate-400'
                    }`} />
                    {user.role === 'admin' ? 'Admin' : 'User'}
                  </span>
                  {(() => {
                    const methods = getProfileSignInMethods(user)
                    if (methods.length === 0) {
                      return (
                        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-slate-100 dark:bg-gray-700 text-slate-500 dark:text-gray-400">
                          Unknown
                        </span>
                      )
                    }
                    return methods.map((method) => {
                      const badge = PROVIDER_BADGE[method]
                      return (
                        <span
                          key={method}
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}
                        >
                          {badge.icon}
                          {badge.label}
                        </span>
                      )
                    })
                  })()}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <Link
                    href={isCurrentUser ? '/profile' : `/profile/${user.uid}`}
                    className="rounded-lg px-3 py-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                    title="View profile"
                  >
                    View Profile
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleToggleRole(user)}
                    disabled={isCurrentUser}
                    className="rounded-lg px-3 py-2 text-xs font-medium text-slate-600 dark:text-gray-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    title={nextRoleLabel(user.role)}
                  >
                    {nextRoleLabel(user.role)}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReset(user)}
                    className="rounded-lg px-3 py-2 text-xs font-medium text-slate-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    title="Reset all game data"
                  >
                    Reset Data
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(user)}
                    disabled={isCurrentUser}
                    className="rounded-lg px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Delete user account permanently"
                  >
                    Delete User
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
