'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '@/app/contexts/AuthContext'
import type { LearningGapReport } from '@/app/services/analyticsService'
import {
  buildReportCsv,
  buildReportHtml,
  downloadFile,
  openPrintableReport,
  reportFileStem,
} from '@/app/services/analyticsReport'

/**
 * "Generate Report" control for the Analytics tab — produces a printable
 * (print-to-PDF) academic report or a CSV of the underlying figures.
 */
export default function AnalyticsReportMenu({ report }: { report: LearningGapReport }) {
  const { currentUser } = useAuth()
  const [open, setOpen] = useState(false)
  const [anonymize, setAnonymize] = useState(true)
  const [institution, setInstitution] = useState('')

  const options = {
    anonymize,
    institution: institution.trim() || undefined,
    preparedBy: currentUser?.displayName || currentUser?.email || undefined,
  }
  const stem = reportFileStem(report.generatedAt)

  const handlePrint = () => {
    const html = buildReportHtml(report, options)
    if (openPrintableReport(html)) {
      setOpen(false)
      return
    }
    // Popup blocked (common on mobile Safari) — hand over the file instead.
    downloadFile(`${stem}.html`, html, 'text/html')
    toast('Popup blocked — report downloaded as HTML. Open it and print to PDF.', { icon: '📄' })
    setOpen(false)
  }

  const handleCsv = () => {
    downloadFile(`${stem}.csv`, buildReportCsv(report, options), 'text/csv')
    toast.success('CSV exported')
    setOpen(false)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl bg-indigo-500 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-600 transition-colors"
      >
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4.25 2A2.25 2.25 0 002 4.25v11.5A2.25 2.25 0 004.25 18h11.5A2.25 2.25 0 0018 15.75V4.25A2.25 2.25 0 0015.75 2H4.25zM6 6.75A.75.75 0 016.75 6h6.5a.75.75 0 010 1.5h-6.5A.75.75 0 016 6.75zm0 3.5a.75.75 0 01.75-.75h6.5a.75.75 0 010 1.5h-6.5a.75.75 0 01-.75-.75zm0 3.5a.75.75 0 01.75-.75h3.5a.75.75 0 010 1.5h-3.5a.75.75 0 01-.75-.75z" clipRule="evenodd" />
        </svg>
        Generate Report
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 p-0 sm:p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Generate Analytics Report</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">
              Produces a formatted report of learning gaps, subject performance, at-risk learners and methodology notes.
            </p>

            <label className="mt-5 flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={anonymize}
                onChange={(e) => setAnonymize(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-slate-800 dark:text-gray-100">
                  Anonymize learner identifiers
                </span>
                <span className="block text-xs text-slate-500 dark:text-gray-400">
                  Replaces names and emails with &ldquo;Student 01&rdquo; pseudonyms. Recommended for reports shared
                  outside the institution.
                </span>
              </span>
            </label>

            <label className="mt-4 block">
              <span className="block text-sm font-medium text-slate-800 dark:text-gray-100">
                Institution / course <span className="font-normal text-slate-400 dark:text-gray-500">(optional)</span>
              </span>
              <input
                type="text"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="e.g. Grade 10 — St. Mary's Academy"
                className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm text-slate-900 dark:text-gray-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 transition-colors placeholder:text-slate-400 dark:placeholder:text-gray-500"
              />
            </label>

            <div className="mt-6 space-y-2.5">
              <button
                type="button"
                onClick={handlePrint}
                className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200 dark:focus:ring-indigo-800"
              >
                Open printable report (PDF)
              </button>
              <button
                type="button"
                onClick={handleCsv}
                className="w-full rounded-xl border border-slate-200 dark:border-gray-600 px-4 py-3 text-sm font-medium text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors"
              >
                Download raw data (CSV)
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-full rounded-xl px-4 py-2.5 text-sm font-medium text-slate-500 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
