import { useEffect, useState } from 'react'
import { getPlatformStats } from '../services/adminService'
import { defaultGames } from '../games/games'

function StatCard({ label, value, icon, color }) {
  return (
    <div className="glass p-6 flex items-start gap-4 animate-fade-in">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${color}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-500 dark:text-gray-400">{label}</p>
        <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-white tabular-nums">{value}</p>
      </div>
    </div>
  )
}

export default function AdminDashboardTab() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getPlatformStats()
      .then(setStats)
      .catch((err) => {
        console.error('Admin: Failed to load platform stats', err)
        setStats({ totalUsers: 0, totalMatches: 0 })
      })
      .finally(() => setLoading(false))
  }, [])

  const totalGames = defaultGames.length

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Dashboard Overview</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">Real-time platform statistics</p>
      </div>

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-2xl glass animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            label="Total Users"
            value={stats?.totalUsers ?? '—'}
            color="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400"
            icon={
              <svg className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 10a4 4 0 100-8 4 4 0 000 8zm-7 8a7 7 0 1114 0H3z" />
              </svg>
            }
          />
          <StatCard
            label="Total Games"
            value={totalGames}
            color="bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400"
            icon={
              <svg className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                <path d="M6.75 2.5A3.25 3.25 0 003.5 5.75v8.5a3.25 3.25 0 003.25 3.25h6.5a3.25 3.25 0 003.25-3.25v-8.5A3.25 3.25 0 0013.25 2.5h-6.5zM8 7a1 1 0 11-2 0 1 1 0 012 0zm5 0a1 1 0 11-2 0 1 1 0 012 0zm-5 5a1 1 0 11-2 0 1 1 0 012 0zm5 0a1 1 0 11-2 0 1 1 0 012 0z" />
              </svg>
            }
          />
          <StatCard
            label="Total Matches Played"
            value={stats?.totalMatches?.toLocaleString() ?? '—'}
            color="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400"
            icon={
              <svg className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 11.293a1 1 0 001.414 1.414l2-2A1 1 0 0011 10V7z" clipRule="evenodd" />
              </svg>
            }
          />
        </div>
      )}

      {/* Quick info cards */}
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="glass p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Quick Actions</h3>
          <ul className="mt-4 space-y-3 text-sm text-slate-600 dark:text-gray-400">
            <li className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-indigo-500" />
              Use the <strong className="text-slate-900 dark:text-white">Games</strong> tab to add, edit, or remove games
            </li>
            <li className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-violet-500" />
              Use the <strong className="text-slate-900 dark:text-white">Users</strong> tab to manage player accounts
            </li>
            <li className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Use <strong className="text-slate-900 dark:text-white">Announcements</strong> to broadcast messages
            </li>
          </ul>
        </div>
        <div className="glass p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">System Info</h3>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500 dark:text-gray-400">Platform</dt>
              <dd className="font-medium text-slate-900 dark:text-white">SkillForge v1.0</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500 dark:text-gray-400">Framework</dt>
              <dd className="font-medium text-slate-900 dark:text-white">React + Vite</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500 dark:text-gray-400">Backend</dt>
              <dd className="font-medium text-slate-900 dark:text-white">Firebase (Firestore)</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  )
}
