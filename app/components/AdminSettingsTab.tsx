'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import {
  getOAuthConfig,
  saveOAuthConfig,
  OAuthConfig,
  getLibrarySettings,
  saveLibrarySettings,
  LibrarySettings,
  LibrarySortMode,
} from '@/app/services/adminService'

const SORT_MODE_OPTIONS: { value: LibrarySortMode | ''; label: string }[] = [
  { value: '', label: 'Let users choose (default)' },
  { value: 'name', label: 'Name (A-Z)' },
  { value: 'recent', label: 'Recently Played' },
  { value: 'popular', label: 'Most Popular Globally' },
]

const PROVIDERS: { key: keyof OAuthConfig; label: string; description: string; icon: React.ReactNode }[] = [
  {
    key: 'google',
    label: 'Google',
    description: 'Sign in with Google account',
    icon: (
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
    ),
  },
  {
    key: 'github',
    label: 'GitHub',
    description: 'Sign in with GitHub account',
    icon: (
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.29-.01-1.04-.02-2.05-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6.01 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.62-5.49 5.92.43.37.81 1.1.81 2.22 0 1.61-.01 2.9-.01 3.29 0 .32.21.7.82.58A12 12 0 0 0 24 12.5C24 5.87 18.63.5 12 .5z"/>
      </svg>
    ),
  },
  {
    key: 'twitter',
    label: 'X (Twitter)',
    description: 'Sign in with X / Twitter account',
    icon: (
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
  },
  {
    key: 'discord',
    label: 'Discord',
    description: 'Sign in with Discord account',
    icon: (
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="#5865F2">
        <path d="M20.317 4.369a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.6 12.6 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.74 19.74 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.891.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
      </svg>
    ),
  },
]

export default function AdminSettingsTab() {
  const [config, setConfig] = useState<OAuthConfig | null>(null)
  const [librarySettings, setLibrarySettings] = useState<LibrarySettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([getOAuthConfig(), getLibrarySettings()])
      .then(([oauth, library]) => {
        setConfig(oauth)
        setLibrarySettings(library)
      })
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false))
  }, [])

  const toggle = (key: keyof OAuthConfig) => {
    if (!config) return
    setConfig({ ...config, [key]: !config[key] })
  }

  const toggleLibrarySetting = (key: keyof LibrarySettings) => {
    if (!librarySettings) return
    setLibrarySettings({ ...librarySettings, [key]: !librarySettings[key] })
  }

  const handleSave = async () => {
    if (!config || !librarySettings) return
    setSaving(true)
    try {
      await Promise.all([saveOAuthConfig(config), saveLibrarySettings(librarySettings)])
      toast.success('Settings saved')
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!config || !librarySettings) return null

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Settings</h2>
        <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
          Control which OAuth sign-in providers are available on the login page.
        </p>
      </div>

      <div className="surface rounded-2xl divide-y divide-slate-200/60 dark:divide-gray-700/60 overflow-hidden">
        <div className="px-5 py-3 bg-slate-50/60 dark:bg-gray-800/40">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400">
            Library
          </p>
        </div>

        <div className="flex items-center justify-between gap-4 px-5 py-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-900 dark:text-white">Show Continue Playing card</p>
            <p className="text-xs text-slate-500 dark:text-gray-400 truncate">
              Display the &quot;Continue playing / Featured game&quot; hero card at the top of the library
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={librarySettings.showContinuePlaying}
            onClick={() => toggleLibrarySetting('showContinuePlaying')}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
              librarySettings.showContinuePlaying
                ? 'bg-indigo-500'
                : 'bg-slate-300 dark:bg-gray-600'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                librarySettings.showContinuePlaying ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between gap-4 px-5 py-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-900 dark:text-white">Global sort order</p>
            <p className="text-xs text-slate-500 dark:text-gray-400 truncate">
              Force how games are sorted in the library for every player, overriding their own preference
            </p>
          </div>

          <select
            value={librarySettings.globalSortMode ?? ''}
            onChange={(e) =>
              setLibrarySettings({
                ...librarySettings,
                globalSortMode: (e.target.value || null) as LibrarySettings['globalSortMode'],
              })
            }
            className="h-9 shrink-0 rounded-lg border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            {SORT_MODE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="surface rounded-2xl divide-y divide-slate-200/60 dark:divide-gray-700/60 overflow-hidden">
        <div className="px-5 py-3 bg-slate-50/60 dark:bg-gray-800/40">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400">
            OAuth Providers
          </p>
        </div>

        {PROVIDERS.map(({ key, label, description, icon }) => {
          const enabled = config[key]
          return (
            <div
              key={key}
              className="flex items-center justify-between gap-4 px-5 py-4"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-gray-700/60">
                  {icon}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{label}</p>
                  <p className="text-xs text-slate-500 dark:text-gray-400 truncate">{description}</p>
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={enabled}
                onClick={() => toggle(key)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
                  enabled
                    ? 'bg-indigo-500'
                    : 'bg-slate-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          )
        })}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60 transition-colors"
        >
          {saving ? (
            <>
              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              Saving…
            </>
          ) : (
            'Save changes'
          )}
        </button>
      </div>
    </div>
  )
}
