import { useEffect, useRef, useState } from 'react'
import { games } from '../games/games'
import { useAuth } from '../contexts/useAuth'
import ThemeToggle from './ThemeToggle'
import { getUserProfile } from '../services/userProfileService'

export default function GameLibrary({ onSelect, onLogout, onStats, displayName }) {
  const { currentUser } = useAuth()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [avatarURL, setAvatarURL] = useState(null)
  const dropdownRef = useRef(null)

  useEffect(() => {
    if (!currentUser?.uid) return
    getUserProfile(currentUser.uid)
      .then((profile) => {
        setAvatarURL(profile?.photoThumbURL || profile?.photoURL || null)
      })
      .catch(() => {})
  }, [currentUser?.uid])

  useEffect(() => {
    if (!dropdownOpen) return
    function handleOutsideClick(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [dropdownOpen])

  const name = displayName || currentUser?.displayName || currentUser?.email || 'Player'
  const initials = name.slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 p-6 transition-colors duration-300">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Game Library</h2>
            {currentUser && (
              <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
                Welcome back, {name}!
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <ThemeToggle />

            {/* Avatar dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen((prev) => !prev)}
                className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center overflow-hidden rounded-full bg-indigo-600 text-sm sm:text-base font-semibold text-white ring-2 ring-transparent transition hover:ring-indigo-400 focus:outline-none focus:ring-indigo-400 dark:bg-indigo-500"
                aria-haspopup="true"
                aria-expanded={dropdownOpen}
              >
                {avatarURL ? (
                  <img src={avatarURL} alt={name} className="h-full w-full object-cover" />
                ) : (
                  initials
                )}
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 z-50 mt-2 w-44 origin-top-right rounded-2xl border border-slate-200 bg-white py-1 shadow-xl dark:border-gray-700 dark:bg-gray-800">
                  <div className="border-b border-slate-100 px-4 py-2 dark:border-gray-700">
                    <p className="truncate text-sm font-medium text-slate-800 dark:text-white">{name}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setDropdownOpen(false); onStats() }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50 dark:text-gray-200 dark:hover:bg-gray-700/60"
                  >
                    <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 10a4 4 0 100-8 4 4 0 000 8zm-7 8a7 7 0 1114 0H3z" />
                    </svg>
                    My Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => { setDropdownOpen(false); onLogout() }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 015.25 2h5.5A2.25 2.25 0 0113 4.25v2a.75.75 0 01-1.5 0v-2a.75.75 0 00-.75-.75h-5.5a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 00.75-.75v-2a.75.75 0 011.5 0v2A2.25 2.25 0 0110.75 18h-5.5A2.25 2.25 0 013 15.75V4.25z" clipRule="evenodd" />
                      <path fillRule="evenodd" d="M6 10a.75.75 0 01.75-.75h9.546l-1.048-1.16a.75.75 0 111.12-1.002l2.5 2.77a.75.75 0 010 1.001l-2.5 2.77a.75.75 0 11-1.12-1.001l1.048-1.16H6.75A.75.75 0 016 10z" clipRule="evenodd" />
                    </svg>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
          {games.map((game) => (
            <div
              key={game.id}
              className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-gray-700/50 bg-white dark:bg-gray-800/80 shadow-sm dark:shadow-lg dark:shadow-black/20 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 dark:hover:shadow-black/40 dark:hover:border-gray-600"
            >
              <div className="aspect-video w-full bg-linear-to-br from-slate-100 to-slate-200 dark:from-gray-700 dark:to-gray-800 overflow-hidden">
                <img
                  className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
                  src={`/games/${game.id}/cover.png`}
                  alt={`${game.name} cover`}
                  loading="lazy"
                  onError={(event) => {
                    event.currentTarget.style.display = 'none'
                  }}
                />
              </div>

              <div className="flex flex-1 flex-col justify-between gap-4 p-5">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{game.name}</h3>
                <button
                  className={`w-full rounded-xl px-5 py-3 font-medium transition-all duration-200 focus:outline-none focus:ring-4 ${game.iframePath
                      ? 'bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-700 dark:hover:bg-indigo-400 hover:shadow-lg hover:shadow-indigo-500/25 focus:ring-indigo-200 dark:focus:ring-indigo-800'
                      : 'cursor-not-allowed bg-slate-200 dark:bg-gray-700 text-slate-400 dark:text-gray-500'
                    }`}
                  disabled={!game.iframePath}
                  onClick={() => onSelect(game.id)}
                >
                  {game.iframePath ? 'Play' : 'Coming Soon'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
