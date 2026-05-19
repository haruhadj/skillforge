'use client'

import { useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import ThemeToggle from '@/app/components/ThemeToggle'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSent, setIsSent] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    try {
      setIsSubmitting(true)
      
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to send reset email')
      }

      setIsSent(true)
      toast.success('Password reset email sent!')
    } catch (error) {
      toast.error(`Failed to send: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 gradient-bg transition-colors duration-500">
        <div className="absolute top-5 right-5 animate-fade-in">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-md animate-scale-in">
          <div className="glass p-10 sm:p-12 text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Check Your Email</h2>
            <p className="mt-3 text-slate-600 dark:text-gray-400">
              We've sent a password reset link to <strong className="text-slate-900 dark:text-gray-200">{email}</strong>
            </p>
            <p className="mt-2 text-sm text-slate-500 dark:text-gray-500">
              The link will expire in 1 hour. Don't forget to check your spam folder.
            </p>
            <Link
              href="/login"
              className="btn-primary w-full mt-8 block text-center"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 gradient-bg transition-colors duration-500">
      <div className="absolute top-5 right-5 animate-fade-in">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md animate-scale-in">
        <div className="glass p-10 sm:p-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">Forgot Password?</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-gray-400">
            Enter your email and we'll send you a link to reset your password.
          </p>
          
          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <label className="block">
              <span className="text-sm font-semibold text-slate-700 dark:text-gray-300">Email Address</span>
              <input
                className="mt-2 w-full rounded-lg border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700/50 px-4 py-3 text-slate-900 dark:text-gray-100 shadow-sm focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200/50 dark:focus:ring-indigo-800/50 transition-all duration-200 placeholder:text-slate-400 dark:placeholder:text-gray-500"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            <button
              className="btn-primary w-full hover:-translate-y-0.5 active:translate-y-0"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
