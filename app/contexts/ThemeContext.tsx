'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { AccentTheme, BackgroundStyle, ThemeContextType } from '@/app/types'

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const ACCENTS: AccentTheme[] = ['violet', 'blue', 'emerald', 'rose', 'amber']
const BACKGROUND_STYLES: BackgroundStyle[] = ['mesh', 'nebula', 'aurora', 'horizon', 'grid', 'ripple']

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

  const [backgroundStyle, setBackgroundStyle] = useState<BackgroundStyle>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('skillforge-bg-style') as BackgroundStyle | null
      if (stored && BACKGROUND_STYLES.includes(stored)) return stored
    }
    return 'mesh'
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

  // Mesh is the default (styled by the base .gradient-bg var) — no attribute needed for it.
  useEffect(() => {
    const root = document.documentElement
    if (backgroundStyle === 'mesh') {
      delete root.dataset.bgStyle
    } else {
      root.dataset.bgStyle = backgroundStyle
    }
    localStorage.setItem('skillforge-bg-style', backgroundStyle)
  }, [backgroundStyle])

  const toggleDarkMode = () => setDarkMode((prev) => !prev)

  const value: ThemeContextType = {
    darkMode,
    toggleDarkMode,
    setDarkMode,
    accent,
    setAccent,
    backgroundStyle,
    setBackgroundStyle,
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}
