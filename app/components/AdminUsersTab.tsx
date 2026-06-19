'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { deleteUserData, getAllUsers, setUserRole } from '@/app/services/adminService'
import { useAuth } from '@/app/contexts/AuthContext'
import { UserProfile } from '@/app/types'

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
    const cycle: Record<string, 'teacher' | 'admin' | 'user'> = {
      user: 'teacher',
      teacher: 'admin',
      admin: 'user',
    }
    const newRole = cycle[user.role ?? 'user'] ?? 'teacher'
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
    if (role === 'teacher') return 'Make Admin'
    return 'Make Teacher'
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
      const response = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
                    <img src={user.photoThumbURL || user.photoURL} alt="" className="h-10 w-10 rounded-full object-cover shrink-0" />
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

                {/* Role badge + Auth provider */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                    user.role === 'admin'
                      ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400'
                      : user.role === 'teacher'
                        ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400'
                        : 'bg-slate-100 dark:bg-gray-800 text-slate-500 dark:text-gray-400'
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${
                      user.role === 'admin' ? 'bg-amber-500' : user.role === 'teacher' ? 'bg-emerald-500' : 'bg-slate-400'
                    }`} />
                    {user.role === 'admin' ? 'Admin' : user.role === 'teacher' ? 'Teacher' : 'User'}
                  </span>
                  {user.authProvider === 'google' && (
                    <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      Google
                    </span>
                  )}
                  {user.authProvider === 'password' && (
                    <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-300">
                      <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                      </svg>
                      Password
                    </span>
                  )}
                  {user.authProvider === 'github' && (
                    <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-gray-200">
                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.29-.01-1.04-.02-2.05-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6.01 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.62-5.49 5.92.43.37.81 1.1.81 2.22 0 1.61-.01 2.9-.01 3.29 0 .32.21.7.82.58A12 12 0 0 0 24 12.5C24 5.87 18.63.5 12 .5z"/>
                      </svg>
                      GitHub
                    </span>
                  )}
                  {user.authProvider === 'twitter' && (
                    <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                      X
                    </span>
                  )}
                  {user.authProvider === 'facebook' && (
                    <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400">
                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                      Facebook
                    </span>
                  )}
                  {(!user.authProvider || user.authProvider === 'unknown') && (
                    <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-slate-100 dark:bg-gray-700 text-slate-500 dark:text-gray-400">
                      Unknown
                    </span>
                  )}
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
