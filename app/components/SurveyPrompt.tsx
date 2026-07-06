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
import { getSurveySettings, SurveySettings } from '@/app/services/adminService'

// Google Form URL for the software-evaluation survey. Paste the share link here, or
// set NEXT_PUBLIC_SURVEY_FORM_URL in the environment to override without a rebuild
// change. The prompt stays hidden until a real form URL is configured.
export const SURVEY_FORM_URL =
  process.env.NEXT_PUBLIC_SURVEY_FORM_URL || 'https://forms.gle/m4CpE6KprFbkZW2N8'

// localStorage keys — kept together so the whole state can be reasoned about at a glance.
const STORAGE = {
  status: 'survey:status', // 'done' | 'dismissed' once the user has resolved the prompt
  lastShown: 'survey:lastShown', // epoch ms of the last time it was displayed
  visits: 'survey:libraryVisits', // how many times the user has landed on the library
} as const

const APPEAR_DELAY_MS = 4000 // let the page settle before it slides in

// Guards against showing more than once within a single page-app session (survives
// client-side navigation back and forth to the library, resets on full reload).
let shownThisSession = false

function isConfigured(): boolean {
  return /^https?:\/\//i.test(SURVEY_FORM_URL)
}

// Pacing knobs (min visits, cooldown, show chance) are admin-configurable from
// config/surveySettings — see AdminSettingsTab. "Maybe later" only defers to the next
// eligible visit, not a long cooldown; only "Take the survey" / "Don't show this again"
// permanently resolve the prompt.
function shouldPrompt(settings: SurveySettings): boolean {
  if (typeof window === 'undefined') return false
  if (!settings.enabled) return false
  if (!isConfigured()) return false
  if (shownThisSession) return false

  const status = localStorage.getItem(STORAGE.status)
  if (status === 'done' || status === 'dismissed') return false

  const visits = Number(localStorage.getItem(STORAGE.visits) || '0') + 1
  localStorage.setItem(STORAGE.visits, String(visits))
  if (visits < settings.minVisitsBeforePrompt) return false

  const lastShown = Number(localStorage.getItem(STORAGE.lastShown) || '0')
  if (Date.now() - lastShown < settings.cooldownMinutes * 60 * 1000) return false

  return Math.random() < settings.showProbability
}

export default function SurveyPrompt() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let timer: number | undefined

    getSurveySettings()
      .then((settings) => {
        if (!shouldPrompt(settings)) return
        timer = window.setTimeout(() => {
          shownThisSession = true
          localStorage.setItem(STORAGE.lastShown, String(Date.now()))
          setOpen(true)
        }, APPEAR_DELAY_MS)
      })
      .catch(() => {})

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
