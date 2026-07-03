'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { AccentTheme, ThemeContextType } from '@/app/types'

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const ACCENTS: AccentTheme[] = ['violet', 'blue', 'emerald', 'rose', 'amber']

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('skillforge-theme')
      return stored ? stored === 'dark' : true
    }
    return true
  })

  const [accent, setAccent] = useState<AccentTheme>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('skillforge-accent') as AccentTheme | null
      if (stored && ACCENTS.includes(stored)) return stored
    }
    return 'violet'
  })

  useEffect(() => {
    const root = document.documentElement
    if (darkMode) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem('skillforge-theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  // Violet is the default (styled by :root/.dark) — no attribute needed for it.
  useEffect(() => {
    const root = document.documentElement
    if (accent === 'violet') {
      delete root.dataset.accent
    } else {
      root.dataset.accent = accent
    }
    localStorage.setItem('skillforge-accent', accent)
  }, [accent])

  const toggleDarkMode = () => setDarkMode((prev) => !prev)

  const value: ThemeContextType = {
    darkMode,
    toggleDarkMode,
    setDarkMode,
    accent,
    setAccent,
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}
