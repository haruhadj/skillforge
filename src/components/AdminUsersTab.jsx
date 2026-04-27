import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { deleteUserData, getAllUsers, setUserRole } from '../services/adminService'
import { useAuth } from '../contexts/useAuth'

export default function AdminUsersTab() {
  const { currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [confirmReset, setConfirmReset] = useState(null)
  const [resetting, setResetting] = useState(false)

  const loadUsers = async () => {
    try {
      setLoading(true)
      const data = await getAllUsers()
      setUsers(data)
    } catch (err) {
      console.error('Admin: Failed to load users', err)
      toast.error(`Failed to load users: ${err.message}`)
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

  const handleToggleRole = async (user) => {
    if (user.uid === currentUser?.uid) {
      toast.error('You cannot change your own role')
      return
    }
    const newRole = user.role === 'admin' ? 'user' : 'admin'
    try {
      await setUserRole(user.uid, newRole)
      toast.success(`${user.username || user.email} is now ${newRole}`)
      await loadUsers()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleResetData = async (uid) => {
    try {
      setResetting(true)
      const result = await deleteUserData(uid)
      toast.success(`Deleted ${result.deletedScores} scores and ${result.deletedStats} stat records`)
      setConfirmReset(null)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
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
          <div className="w-full max-w-sm rounded-3xl border border-red-200 dark:border-red-800 bg-white dark:bg-gray-900 p-6 shadow-2xl animate-scale-in">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Reset User Data</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-gray-400">
              This will permanently delete all scores and game stats for <strong>{confirmReset.username || confirmReset.email || confirmReset.uid}</strong>. This cannot be undone.
            </p>
            <div className="mt-5 flex gap-3">
              <button type="button" disabled={resetting} className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-200 dark:focus:ring-red-800 disabled:opacity-60" onClick={() => handleResetData(confirmReset.uid)}>
                {resetting ? 'Deleting...' : 'Delete All Data'}
              </button>
              <button type="button" className="btn-secondary flex-1" onClick={() => setConfirmReset(null)}>Cancel</button>
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

                {/* Role badge */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${user.role === 'admin' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400' : 'bg-slate-100 dark:bg-gray-800 text-slate-500 dark:text-gray-400'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${user.role === 'admin' ? 'bg-amber-500' : 'bg-slate-400'}`} />
                    {user.role === 'admin' ? 'Admin' : 'User'}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleRole(user)}
                    disabled={isCurrentUser}
                    className="rounded-lg px-3 py-2 text-xs font-medium text-slate-600 dark:text-gray-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    title={user.role === 'admin' ? 'Demote to user' : 'Promote to admin'}
                  >
                    {user.role === 'admin' ? 'Demote' : 'Promote'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReset(user)}
                    className="rounded-lg px-3 py-2 text-xs font-medium text-slate-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    title="Reset all game data"
                  >
                    Reset Data
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
