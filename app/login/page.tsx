'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { useAuth } from '@/app/contexts/AuthContext'
import ThemeToggle from '@/app/components/ThemeToggle'

export default function LoginPage() {
  const router = useRouter()
  const { currentUser, login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Redirect if already logged in
  useEffect(() => {
    if (currentUser) {
      router.push('/library')
    }
  }, [currentUser, router])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    try {
      setIsSubmitting(true)
      await login(email, password)
      toast.success('Logged in successfully')
      router.push('/library')
    } catch (error) {
      toast.error(`Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 gradient-bg transition-colors duration-500">
      <div className="absolute top-5 right-5 animate-fade-in">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md animate-scale-in">
        <div className="glass p-10 sm:p-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">Login</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-gray-400">Welcome back to SkillForge</p>
          
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

            <label className="block">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700 dark:text-gray-300">Password</span>
                <Link href="/forgot-password" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                  Forgot password?
                </Link>
              </div>
              <input
                className="mt-2 w-full rounded-lg border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700/50 px-4 py-3 text-slate-900 dark:text-gray-100 shadow-sm focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200/50 dark:focus:ring-indigo-800/50 transition-all duration-200 placeholder:text-slate-400 dark:placeholder:text-gray-500"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>

            <button
              className="btn-primary w-full hover:-translate-y-0.5 active:translate-y-0"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <Link
            href="/"
            className="btn-secondary w-full mt-4 block text-center hover:-translate-y-0.5 active:translate-y-0"
          >
            Back
          </Link>
        </div>
      </div>
    </div>
  )
}
