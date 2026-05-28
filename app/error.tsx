'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center p-6 gradient-bg transition-colors duration-500">
      <div className="glass rounded-2xl p-10 max-w-md w-full text-center shadow-xl">
        <p className="text-5xl font-black text-red-500 dark:text-red-400 leading-none">!</p>
        <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">Something went wrong</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-gray-400">
          An unexpected error occurred. You can try again or return to the library.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-indigo-500 transition-colors"
          >
            Try again
          </button>
          <a
            href="/library"
            className="rounded-xl border border-slate-300 dark:border-gray-600 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-gray-200 hover:bg-slate-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            Go to Library
          </a>
        </div>
      </div>
    </div>
  )
}
