'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/app/contexts/AuthContext'
import ThemeToggle from '@/app/components/ThemeToggle'
import { getUserProfile } from '@/app/services/userProfileService'
import { isAdmin } from '@/app/services/adminService'
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
