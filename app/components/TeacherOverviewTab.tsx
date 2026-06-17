'use client'

import { useEffect, useState } from 'react'
import { getAllUsers, getPlatformStats } from '@/app/services/adminService'
import { defaultGames } from '@/app/games/games'

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string
  value: string | number
  icon: React.ReactNode
  color: string
}) {
  return (
    <div className="glass p-6 flex items-start gap-4">
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

export default function TeacherOverviewTab() {
  const [loading, setLoading] = useState(true)
  const [studentCount, setStudentCount] = useState(0)
  const [teacherCount, setTeacherCount] = useState(0)
  const [totalMatches, setTotalMatches] = useState(0)

  useEffect(() => {
    Promise.all([getPlatformStats(), getAllUsers()])
      .then(([stats, users]) => {
        setTotalMatches(stats.totalMatches)
        setStudentCount(users.filter((u) => !u.role || u.role === 'user').length)
        setTeacherCount(users.filter((u) => u.role === 'teacher').length)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const totalGames = defaultGames.length

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Dashboard Overview</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">Class and platform summary</p>
      </div>

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-2xl glass animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Students"
            value={studentCount}
            color="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400"
            icon={
              <svg className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
              </svg>
            }
          />
          <StatCard
            label="Teachers"
            value={teacherCount}
            color="bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-400"
            icon={
              <svg className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
              </svg>
            }
          />
          <StatCard
            label="Available Games"
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
            value={totalMatches.toLocaleString()}
            color="bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400"
            icon={
              <svg className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 11.293a1 1 0 001.414 1.414l2-2A1 1 0 0011 10V7z" clipRule="evenodd" />
              </svg>
            }
          />
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="glass p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">What You Can Do</h3>
          <ul className="mt-4 space-y-3 text-sm text-slate-600 dark:text-gray-400">
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
              Use the <strong className="text-slate-900 dark:text-white ml-1">Students</strong>&nbsp;tab to view each student's game scores and progress
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-sky-500" />
              Click any student to see a full breakdown of their performance per game
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-violet-500" />
              Use the <strong className="text-slate-900 dark:text-white ml-1">Activity</strong>&nbsp;tab to monitor recent game sessions across the class
            </li>
          </ul>
        </div>
        <div className="glass p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Curriculum Subjects</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {['Mathematics', 'Science', 'English', 'Literature'].map((subject) => (
              <span
                key={subject}
                className="inline-flex items-center rounded-full bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-800"
              >
                {subject}
              </span>
            ))}
          </div>
          <p className="mt-4 text-sm text-slate-500 dark:text-gray-400">
            SkillForge games are aligned with the Senior High School curriculum of Our Lady of Assumption College.
          </p>
        </div>
      </div>
    </div>
  )
}
