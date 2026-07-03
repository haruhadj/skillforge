'use client'

import toast from 'react-hot-toast'
import { useTheme } from '@/app/contexts/ThemeContext'
import { saveUserPreferences } from '@/app/services/userProfileService'
import { AccentTheme, BackgroundStyle } from '@/app/types'

const ACCENTS: { value: AccentTheme; label: string; swatch: string }[] = [
  { value: 'violet', label: 'Violet', swatch: 'oklch(0.55 0.24 292)' },
  { value: 'blue', label: 'Blue', swatch: 'oklch(0.55 0.22 255)' },
  { value: 'emerald', label: 'Emerald', swatch: 'oklch(0.60 0.15 158)' },
  { value: 'rose', label: 'Rose', swatch: 'oklch(0.58 0.21 12)' },
  { value: 'amber', label: 'Amber', swatch: 'oklch(0.70 0.15 78)' },
]

const BACKGROUND_STYLES: { value: BackgroundStyle; label: string }[] = [
  { value: 'mesh', label: 'Mesh' },
  { value: 'nebula', label: 'Nebula' },
  { value: 'aurora', label: 'Aurora' },
  { value: 'horizon', label: 'Horizon' },
  { value: 'grid', label: 'Grid' },
  { value: 'ripple', label: 'Ripple' },
]

/**
 * Appearance settings — theme (dark/light) + accent color + background style. Applies changes to the
 * live ThemeContext instantly (localStorage-backed, no flash) and persists them to
 * the user's profile via saveUserPreferences so the look syncs across devices.
 */
export default function AppearanceSettings({ uid }: { uid: string }) {
  const { darkMode, setDarkMode, accent, setAccent, backgroundStyle, setBackgroundStyle } = useTheme()

  const chooseTheme = (dark: boolean) => {
    setDarkMode(dark)
    saveUserPreferences(uid, { theme: dark ? 'dark' : 'light' }).catch(() => toast.error('Could not save theme'))
  }

  const chooseAccent = (next: AccentTheme) => {
    setAccent(next)
    saveUserPreferences(uid, { accent: next }).catch(() => toast.error('Could not save accent'))
  }

  const chooseBackground = (next: BackgroundStyle) => {
    setBackgroundStyle(next)
    saveUserPreferences(uid, { backgroundStyle: next }).catch(() => toast.error('Could not save background'))
  }

  return (
    <div className="surface p-6">
      <h3 className="text-base font-semibold mb-1">Appearance</h3>
      <p className="text-xs text-muted-foreground mb-4">Personalize how SkillForge looks. Saved to your account.</p>

      {/* Theme */}
      <div className="mb-5">
        <p className="text-sm font-medium mb-2">Theme</p>
        <div className="inline-flex rounded-xl border border-border p-1 bg-secondary/40">
          {([
            { dark: false, label: 'Light' },
            { dark: true, label: 'Dark' },
          ] as const).map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => chooseTheme(opt.dark)}
              aria-pressed={darkMode === opt.dark}
              className={`h-9 px-5 rounded-lg text-sm font-semibold transition-colors ${
                darkMode === opt.dark ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Accent */}
      <div>
        <p className="text-sm font-medium mb-2">Accent color</p>
        <div className="flex flex-wrap gap-3">
          {ACCENTS.map((a) => (
            <button
              key={a.value}
              type="button"
              onClick={() => chooseAccent(a.value)}
              aria-pressed={accent === a.value}
              aria-label={a.label}
              title={a.label}
              className={`h-10 w-10 rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                accent === a.value ? 'ring-2 ring-offset-2 ring-offset-background ring-foreground scale-105' : 'hover:scale-105'
              }`}
              style={{ backgroundColor: a.swatch }}
            >
              {accent === a.value && (
                <svg className="h-5 w-5 mx-auto text-white drop-shadow" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 011.4-1.4l3.3 3.29 6.8-6.8a1 1 0 011.4 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Background */}
      <div className="mt-5">
        <p className="text-sm font-medium mb-2">Background</p>
        <div className="flex flex-wrap gap-3">
          {BACKGROUND_STYLES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => chooseBackground(s.value)}
              aria-pressed={backgroundStyle === s.value}
              aria-label={s.label}
              title={s.label}
              data-bg-style={s.value === 'mesh' ? undefined : s.value}
              className={`gradient-bg relative h-14 w-20 rounded-xl overflow-hidden border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                backgroundStyle === s.value ? 'border-foreground ring-2 ring-offset-2 ring-offset-background ring-foreground scale-105' : 'border-border hover:scale-105'
              }`}
            >
              {backgroundStyle === s.value && (
                <svg className="h-4 w-4 absolute top-1 right-1 text-foreground drop-shadow" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 011.4-1.4l3.3 3.29 6.8-6.8a1 1 0 011.4 0z" clipRule="evenodd" />
                </svg>
              )}
              <span className="absolute bottom-1 left-1.5 text-[10px] font-medium text-foreground/70">{s.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
