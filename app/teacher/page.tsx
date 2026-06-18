'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { doc, getDoc } from 'firebase/firestore'
import { useAuth } from '@/app/contexts/AuthContext'
import { db } from '@/app/lib/firebase'
import ThemeToggle from '@/app/components/ThemeToggle'
import TeacherOverviewTab from '@/app/components/TeacherOverviewTab'
import TeacherStudentsTab from '@/app/components/TeacherStudentsTab'
import TeacherActivityTab from '@/app/components/TeacherActivityTab'
import AdminAnalyticsTab from '@/app/components/AdminAnalyticsTab'

const TABS = [
  {
    id: 'overview',
    label: 'Overview',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
      </svg>
    ),
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M15.5 2A1.5 1.5 0 0014 3.5v13a1.5 1.5 0 003 0v-13A1.5 1.5 0 0015.5 2zM9.5 6A1.5 1.5 0 008 7.5v9a1.5 1.5 0 003 0v-9A1.5 1.5 0 009.5 6zM3.5 10A1.5 1.5 0 002 11.5v5a1.5 1.5 0 003 0v-5A1.5 1.5 0 003.5 10z" />
      </svg>
    ),
  },
  {
    id: 'students',
    label: 'Students',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
      </svg>
    ),
  },
  {
    id: 'activity',
    label: 'Activity',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
      </svg>
    ),
  },
]

export default function TeacherPage() {
  const router = useRouter()
  const { currentUser } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')
  const [authorized, setAuthorized] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (!currentUser) {
      router.push('/')
      return
    }
    getDoc(doc(db, 'users', currentUser.uid))
      .then((snap) => {
        const role = snap.data()?.role
        if (role === 'teacher' || role === 'admin') {
          setAuthorized(true)
        } else {
          router.push('/library')
        }
      })
      .catch(() => router.push('/library'))
      .finally(() => setChecking(false))
  }, [currentUser, router])

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return <TeacherOverviewTab />
      case 'analytics': return <AdminAnalyticsTab />
      case 'students': return <TeacherStudentsTab />
      case 'activity': return <TeacherActivityTab />
      default: return <TeacherOverviewTab />
    }
  }

  if (checking || !currentUser) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!authorized) return null

  return (
    <div className="min-h-screen gradient-bg transition-colors duration-500">
      <header className="sticky top-0 z-40 glass border-b border-slate-200/50 dark:border-gray-700/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/library"
              className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.56l3.47 3.47a.75.75 0 11-1.06 1.06l-4.75-4.75a.75.75 0 010-1.06l4.75-4.75a.75.75 0 011.06 1.06L5.56 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
              </svg>
              <span className="hidden sm:inline">Back to Library</span>
            </Link>
            <div className="h-6 w-px bg-slate-300 dark:bg-gray-600 hidden sm:block" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              <span className="text-emerald-600 dark:text-emerald-400">Teacher</span> Dashboard
            </h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <div className="mx-auto max-w-7xl flex flex-col lg:flex-row">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex lg:w-56 lg:shrink-0 lg:flex-col lg:sticky lg:top-[73px] lg:h-[calc(100vh-73px)] px-4 py-6">
          <nav className="space-y-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 shadow-sm'
                    : 'text-slate-600 dark:text-gray-400 hover:bg-slate-100/80 dark:hover:bg-gray-800/50 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Mobile bottom tabs */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 glass border-t border-slate-200/50 dark:border-gray-700/50 pb-[env(safe-area-inset-bottom)]">
          <div className="flex justify-around">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center gap-1 flex-1 py-2 min-h-[56px] text-[10px] sm:text-xs font-medium transition-colors ${
                  activeTab === tab.id ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-gray-500'
                }`}
              >
                <div className="shrink-0">{tab.icon}</div>
                <span className="block scale-95 origin-center tracking-tight leading-none mt-0.5">{tab.label}</span>
              </button>
            ))}
          </div>
        </nav>

        <main className="flex-1 min-w-0 px-4 sm:px-6 py-6 pb-24 lg:pb-6">
          {renderContent()}
        </main>
      </div>
    </div>
  )
}
