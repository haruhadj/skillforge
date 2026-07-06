'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

// Google Form URL for the software-evaluation survey. Paste the share link here, or
// set NEXT_PUBLIC_SURVEY_FORM_URL in the environment to override without a rebuild
// change. The prompt stays hidden until a real form URL is configured.
const SURVEY_FORM_URL =
  process.env.NEXT_PUBLIC_SURVEY_FORM_URL || 'PASTE_YOUR_GOOGLE_FORM_LINK_HERE'

// localStorage keys — kept together so the whole state can be reasoned about at a glance.
const STORAGE = {
  status: 'survey:status', // 'done' | 'dismissed' once the user has resolved the prompt
  lastShown: 'survey:lastShown', // epoch ms of the last time it was displayed
  visits: 'survey:libraryVisits', // how many times the user has landed on the library
} as const

// Non-aggressive pacing: only start considering the prompt after a little engagement,
// never re-prompt within the cooldown window, and even when eligible only show it some
// of the time so it feels occasional rather than every-visit.
const MIN_VISITS_BEFORE_PROMPT = 2
const COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000 // 3 days between prompts
const SHOW_PROBABILITY = 0.4 // ~40% of eligible visits
const APPEAR_DELAY_MS = 4000 // let the page settle before it slides in

// Guards against showing more than once within a single page-app session (survives
// client-side navigation back and forth to the library, resets on full reload).
let shownThisSession = false

function isConfigured(): boolean {
  return /^https?:\/\//i.test(SURVEY_FORM_URL)
}

function shouldPrompt(): boolean {
  if (typeof window === 'undefined') return false
  if (!isConfigured()) return false
  if (shownThisSession) return false

  const status = localStorage.getItem(STORAGE.status)
  if (status === 'done' || status === 'dismissed') return false

  const visits = Number(localStorage.getItem(STORAGE.visits) || '0') + 1
  localStorage.setItem(STORAGE.visits, String(visits))
  if (visits < MIN_VISITS_BEFORE_PROMPT) return false

  const lastShown = Number(localStorage.getItem(STORAGE.lastShown) || '0')
  if (Date.now() - lastShown < COOLDOWN_MS) return false

  return Math.random() < SHOW_PROBABILITY
}

export default function SurveyPrompt() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!shouldPrompt()) return
    const timer = window.setTimeout(() => {
      shownThisSession = true
      localStorage.setItem(STORAGE.lastShown, String(Date.now()))
      setOpen(true)
    }, APPEAR_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [])

  // "Maybe later" / backdrop dismiss: keep status pending so it can return after the
  // cooldown; lastShown was already stamped when it opened, so the cooldown applies.
  const handleLater = () => setOpen(false)

  const handleTakeSurvey = () => {
    localStorage.setItem(STORAGE.status, 'done')
    window.open(SURVEY_FORM_URL, '_blank', 'noopener,noreferrer')
    setOpen(false)
  }

  const handleNeverAgain = () => {
    localStorage.setItem(STORAGE.status, 'dismissed')
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleLater()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-2xl select-none">
            📝
          </div>
          <DialogTitle className="text-center text-lg">Got a minute?</DialogTitle>
          <DialogDescription className="text-center">
            We&apos;d love your feedback on SkillForge. Filling out a short software
            evaluation survey helps us make the games better for everyone.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-1 flex flex-col gap-2">
          <Button onClick={handleTakeSurvey} className="w-full font-semibold">
            Take the survey →
          </Button>
          <Button variant="ghost" onClick={handleLater} className="w-full">
            Maybe later
          </Button>
          <button
            type="button"
            onClick={handleNeverAgain}
            className="mx-auto text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors"
          >
            Don&apos;t show this again
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
