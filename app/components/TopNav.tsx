'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { Bell } from 'lucide-react'
import { useAuth } from '@/app/contexts/AuthContext'
import ThemeToggle from '@/app/components/ThemeToggle'
import { getUserProfile } from '@/app/services/userProfileService'
import { isAdmin, getActiveAnnouncements } from '@/app/services/adminService'
import { Announcement } from '@/app/types'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const ANNOUNCEMENT_TYPE_STYLES: Record<Announcement['type'], string> = {
  info: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/50 text-blue-800 dark:text-blue-300',
  warning: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300',
  success: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300',
}

const ANNOUNCEMENTS_LAST_SEEN_KEY = 'announcements:lastSeenId'

const NAV_LINKS = [
  { href: '/library', label: 'Library' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/activity', label: 'Activity' },
] as const

interface TopNavProps {
  /**
   * When provided, the search box is controlled and fires live on every change
   * (used by the library to filter its grid). When omitted, submitting the
   * search navigates to /library?q=<term>.
   */
  searchValue?: string
  onSearch?: (value: string) => void
}

/**
 * Unified sticky top navigation shared across all app screens — logo, page
 * pills (active via pathname), functional game search, theme toggle, and the
 * account dropdown. Fetches its own profile/admin data so pages don't have to.
 */
export default function TopNav({ searchValue, onSearch }: TopNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { currentUser, logout } = useAuth()
  const [avatarURL, setAvatarURL] = useState<string | null>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [isAdminUser, setIsAdminUser] = useState(false)
  const [localSearch, setLocalSearch] = useState('')
  const [onlineCount, setOnlineCount] = useState<number | null>(null)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [hasUnseenAnnouncement, setHasUnseenAnnouncement] = useState(false)
  const controlled = onSearch !== undefined

  useEffect(() => {
    if (!currentUser?.uid) return
    getUserProfile(currentUser.uid)
      .then((p) => {
        setAvatarURL(p?.photoThumbURL || p?.photoURL || null)
        setUsername(p?.username ?? null)
      })
      .catch(() => {})
    isAdmin(currentUser.uid).then(setIsAdminUser).catch(() => setIsAdminUser(false))
  }, [currentUser?.uid])

  // Live "players online now" pill. Polls on a short interval (route is cached ~10s
  // server-side, and the poll stays well under the 60 req/min rate limit) so the
  // count reflects joins/leaves quickly. Also refreshes when the tab regains focus.
  useEffect(() => {
    let active = true
    const load = () =>
      fetch('/api/presence/online')
        .then((r) => r.json())
        .then((d) => { if (active && typeof d.count === 'number') setOnlineCount(d.count) })
        .catch(() => {})
    load()
    const id = setInterval(load, 20_000)
    const onVisible = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      active = false
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  useEffect(() => {
    getActiveAnnouncements()
      .then((list) => {
        setAnnouncements(list)
        if (typeof window === 'undefined' || list.length === 0) return
        const lastSeenId = localStorage.getItem(ANNOUNCEMENTS_LAST_SEEN_KEY)
        setHasUnseenAnnouncement(list[0].id !== lastSeenId)
      })
      .catch(() => {})
  }, [])

  const handleAnnouncementsOpenChange = (open: boolean) => {
    if (open && typeof window !== 'undefined' && announcements.length > 0) {
      localStorage.setItem(ANNOUNCEMENTS_LAST_SEEN_KEY, announcements[0].id)
      setHasUnseenAnnouncement(false)
    }
  }

  const name = username || currentUser?.displayName || currentUser?.email || 'Player'
  const initials = name.slice(0, 2).toUpperCase()
  const search = controlled ? (searchValue ?? '') : localSearch

  const handleLogout = async () => {
    try { await logout(); router.push('/') } catch { /* noop */ }
  }

  const handleSearchChange = (value: string) => {
    if (controlled) onSearch?.(value)
    else setLocalSearch(value)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!controlled) {
      const q = localSearch.trim()
      router.push(q ? `/library?q=${encodeURIComponent(q)}` : '/library')
    }
  }

  const isActive = (href: string) => pathname === href || pathname?.startsWith(`${href}/`)

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50 animate-fade-in">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center gap-4 sm:gap-6">
        {/* Logo */}
        <Link href="/library" className="flex items-center gap-2.5 shrink-0">
          <Image src="/game logo.jpeg" alt="SkillForge" width={31} height={31} className="rounded-lg" priority />
          <span className="font-bold text-base tracking-tight hidden sm:inline">SkillForge</span>
        </Link>

        {/* Page pills */}
        <nav className="hidden md:flex items-center gap-0.5">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link.href) ? 'page' : undefined}
              className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                isActive(link.href)
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right cluster */}
        <div className="ml-auto flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Players online */}
          {onlineCount !== null && onlineCount > 0 && (
            <span
              className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold"
              title={`${onlineCount} playing now`}
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="mono">{onlineCount}</span>
              <span className="hidden sm:inline">online</span>
            </span>
          )}

          {/* Search */}
          <form onSubmit={handleSearchSubmit} className="hidden sm:block">
            <label className="flex items-center gap-2 h-9 px-3 rounded-full border border-border bg-secondary/60 text-muted-foreground focus-within:border-primary/50 transition-colors w-44 lg:w-52">
              <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" className="shrink-0" aria-hidden="true">
                <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
              </svg>
              <input
                type="search"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search games"
                className="bg-transparent border-0 outline-none text-sm text-foreground placeholder:text-muted-foreground w-full"
              />
            </label>
          </form>

          <DropdownMenu onOpenChange={handleAnnouncementsOpenChange}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative rounded-full h-9 w-9" aria-label="Announcements">
                <Bell className="h-[18px] w-[18px]" />
                {hasUnseenAnnouncement && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-background" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Announcements</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {announcements.length === 0 ? (
                <p className="px-2 py-4 text-sm text-muted-foreground text-center">No announcements</p>
              ) : (
                <div className="max-h-80 overflow-y-auto space-y-2 p-1">
                  {announcements.map((ann) => (
                    <div key={ann.id} className={`rounded-xl border px-3 py-2 text-sm ${ANNOUNCEMENT_TYPE_STYLES[ann.type] || ANNOUNCEMENT_TYPE_STYLES.info}`}>
                      <p className="font-semibold">{ann.title}</p>
                      {ann.message && <p className="opacity-80 mt-0.5">{ann.message}</p>}
                      {ann.linkUrl && (
                        <a href={ann.linkUrl} target="_blank" rel="noopener noreferrer" className="underline font-medium mt-1 inline-block hover:opacity-80 transition-opacity">
                          Learn more ↗
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <ThemeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 p-0 ring-2 ring-border hover:ring-primary/50 transition-all">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={avatarURL ?? undefined} alt={name} referrerPolicy="no-referrer" />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">{initials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="font-normal">
                <p className="font-semibold truncate">{name}</p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{currentUser?.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild><Link href="/profile" className="cursor-pointer">My Profile</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link href="/leaderboard" className="cursor-pointer">Leaderboard</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link href="/activity" className="cursor-pointer">Activity</Link></DropdownMenuItem>
              {isAdminUser && (
                <DropdownMenuItem asChild><Link href="/admin" className="cursor-pointer">Admin Panel</Link></DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive cursor-pointer">
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
