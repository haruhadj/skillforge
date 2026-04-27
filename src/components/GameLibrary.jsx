import { useEffect, useRef, useState } from 'react'
import { games } from '../games/games'
import { useAuth } from '../contexts/useAuth'
import ThemeToggle from './ThemeToggle'
import { getUserProfile } from '../services/userProfileService'
import { getActiveAnnouncements } from '../services/adminService'

export default function GameLibrary({ onSelect, onLogout, onStats, onLeaderboard, onAdmin, displayName, isAdmin }) {
  const { currentUser } = useAuth()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [avatarURL, setAvatarURL] = useState(null)
  const [announcements, setAnnouncements] = useState([])
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState([])
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

  useEffect(() => {
    getActiveAnnouncements()
      .then(setAnnouncements)
      .catch(() => {})
  }, [])

  const name = displayName || currentUser?.displayName || currentUser?.email || 'Player'
  const initials = name.slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen gradient-bg transition-colors duration-500">
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 glass border-b border-slate-200/50 dark:border-gray-700/50 animate-fade-in">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">Game Library</h2>
            {currentUser && (
              <p className="text-base text-slate-600 dark:text-gray-400 mt-2 font-350">
                Welcome back, <span className="font-semibold">{name}</span>!
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <ThemeToggle />

            {/* Avatar Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen((prev) => !prev)}
                className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-indigo-600 to-indigo-700 dark:from-indigo-500 dark:to-indigo-600 text-sm font-semibold text-white ring-2 ring-indigo-200 dark:ring-indigo-800 transition-all duration-300 hover:ring-indigo-400 dark:hover:ring-indigo-600 hover:shadow-lg focus:outline-none focus:ring-indigo-400 dark:focus:ring-indigo-600"
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
                <div className="absolute right-0 z-50 mt-3 w-48 origin-top-right animate-scale-in">
                  <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 shadow-xl rounded-lg py-2">
                    <div className="border-b border-slate-200 dark:border-gray-700 px-4 py-3">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{name}</p>
                      <p className="truncate text-xs text-slate-500 dark:text-gray-400 mt-1">{currentUser?.email}</p>
                    </div>
                    <div className="py-2">
                      <button
                        type="button"
                        onClick={() => { setDropdownOpen(false); onStats() }}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-gray-200 transition-colors hover:bg-indigo-50 dark:hover:bg-gray-700/80"
                      >
                        <svg className="h-5 w-5 flex-shrink-0 text-indigo-600 dark:text-indigo-400" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 10a4 4 0 100-8 4 4 0 000 8zm-7 8a7 7 0 1114 0H3z" />
                        </svg>
                        My Profile
                      </button>
                      <button
                        type="button"
                        onClick={() => { setDropdownOpen(false); onLeaderboard() }}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-gray-200 transition-colors hover:bg-violet-50 dark:hover:bg-gray-700/80"
                      >
                        <svg className="h-5 w-5 flex-shrink-0 text-violet-600 dark:text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.496m0 0L12 12m0 0V3.75" />
                        </svg>
                        Leaderboard
                      </button>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => { setDropdownOpen(false); onAdmin() }}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-gray-200 transition-colors hover:bg-amber-50 dark:hover:bg-gray-700/80"
                        >
                          <svg className="h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                          </svg>
                          Admin Panel
                        </button>
                      )}
                      <div className="border-t border-slate-200 dark:border-gray-700 my-2"></div>
                      <button
                        type="button"
                        onClick={() => { setDropdownOpen(false); onLogout() }}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 015.25 2h5.5A2.25 2.25 0 0113 4.25v2a.75.75 0 01-1.5 0v-2a.75.75 0 00-.75-.75h-5.5a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 00.75-.75v-2a.75.75 0 011.5 0v2A2.25 2.25 0 0110.75 18h-5.5A2.25 2.25 0 013 15.75V4.25z" clipRule="evenodd" />
                          <path fillRule="evenodd" d="M6 10a.75.75 0 01.75-.75h9.546l-1.048-1.16a.75.75 0 111.12-1.002l2.5 2.77a.75.75 0 010 1.001l-2.5 2.77a.75.75 0 11-1.12-1.001l1.048-1.16H6.75A.75.75 0 016 10z" clipRule="evenodd" />
                        </svg>
                        Sign Out
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Announcement Banner */}
      {announcements.filter((a) => !dismissedAnnouncements.includes(a.id)).length > 0 && (
        <div className="mx-auto max-w-6xl px-6 pt-6">
          {announcements.filter((a) => !dismissedAnnouncements.includes(a.id)).map((ann) => {
            const colorMap = {
              info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300',
              warning: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300',
              success: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300',
            }
            return (
              <div key={ann.id} className={`mb-3 flex items-start gap-3 rounded-2xl border px-5 py-4 ${colorMap[ann.type] || colorMap.info} animate-slide-up`}>
                <svg className="h-5 w-5 mt-0.5 shrink-0 opacity-70" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 3a1 1 0 00-1.447-.894L8.763 6H5a3 3 0 000 6h.28l1.771 5.316A1 1 0 008 18h1a1 1 0 001-1v-4.382l6.553 3.276A1 1 0 0018 15V3z" clipRule="evenodd" />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{ann.title}</p>
                  {ann.message && <p className="mt-0.5 text-sm opacity-80">{ann.message}</p>}
                </div>
                <button type="button" onClick={() => setDismissedAnnouncements((prev) => [...prev, ann.id])} className="rounded-full p-1 opacity-60 hover:opacity-100 transition-opacity shrink-0">
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M4.22 4.22a.75.75 0 011.06 0L10 8.94l4.72-4.72a.75.75 0 111.06 1.06L11.06 10l4.72 4.72a.75.75 0 11-1.06 1.06L10 11.06l-4.72 4.72a.75.75 0 01-1.06-1.06L8.94 10 4.22 5.28a.75.75 0 010-1.06z" /></svg>
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Games Grid */}
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-max">
          {games.map((game, idx) => (
            <div
              key={game.id}
              className="group animate-fade-in"
              style={{ animationDelay: `${Math.min(idx * 50, 300)}ms` }}
            >
              <div className="glass overflow-hidden transition-all duration-400 hover:shadow-xl dark:hover:shadow-2xl dark:hover:shadow-black/30 hover:-translate-y-1 h-full flex flex-col card-hover">
                {/* Image Container */}
                <div className="aspect-video w-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-gray-700 dark:to-gray-800 overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <img
                    className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-110"
                    src={`/games/${game.id}/cover.png`}
                    alt={`${game.name} cover`}
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.style.display = 'none'
                    }}
                  />
                </div>

                {/* Content */}
                <div className="flex flex-1 flex-col justify-between gap-4 p-5">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white line-clamp-2">{game.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-gray-400 mt-2 font-350">{game.description}</p>
                  </div>
                  
                  <button
                    className={`w-full rounded-lg px-5 py-3 font-semibold transition-all duration-200 focus:outline-none focus:ring-4 ${game.iframePath
                        ? 'btn-primary hover:-translate-y-0.5 active:translate-y-0'
                        : 'cursor-not-allowed bg-slate-200 dark:bg-gray-700 text-slate-400 dark:text-gray-500'
                      }`}
                    disabled={!game.iframePath}
                    onClick={() => onSelect(game.id)}
                  >
                    {game.iframePath ? 'Play Now' : 'Coming Soon'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
