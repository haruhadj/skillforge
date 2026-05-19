'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { useAuth } from '@/app/contexts/AuthContext'
import { claimUsername } from '@/app/services/userProfileService'
import ThemeToggle from '@/app/components/ThemeToggle'

export default function SignupPage() {
  const router = useRouter()
  const { currentUser, signup, signInWithFacebook } = useAuth()
  const [isFacebookSubmitting, setIsFacebookSubmitting] = useState(false)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Redirect if already logged in
  useEffect(() => {
    if (currentUser) {
      router.push('/library')
    }
  }, [currentUser, router])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    if (!/^[A-Za-z0-9_]{3,20}$/.test(username.trim())) {
      toast.error('Username must be 3-20 characters and use letters, numbers, or underscores only')
      return
    }

    try {
      setIsSubmitting(true)
      const userCredential = await signup(email, password)
      console.log('[Signup] Auth user created:', userCredential.user.uid, userCredential.user.email)
      
      // Claim username immediately after signup
      const result = await claimUsername(
        userCredential.user.uid,
        username.trim(),
        {
          email: userCredential.user.email || email,
          authProvider: 'password',
        }
      )
      console.log('[Signup] Username claimed:', result)

      toast.success('Account created successfully')
      router.push('/library')
    } catch (error) {
      toast.error(`Signup failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFacebookSignup = async () => {
    try {
      setIsFacebookSubmitting(true)
      await signInWithFacebook()
      toast.success('Account created with Facebook')
      router.push('/library')
    } catch (error) {
      toast.error(`Facebook sign up failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsFacebookSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 gradient-bg transition-colors duration-500">
      <div className="absolute top-5 right-5 animate-fade-in">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md animate-scale-in">
        <div className="glass p-10 sm:p-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">Create Account</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-gray-400">Join SkillForge and start learning</p>
          
          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="text-sm font-semibold text-slate-700 dark:text-gray-300">Username</span>
              <input
                className="mt-2 w-full rounded-lg border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700/50 px-4 py-3 text-slate-900 dark:text-gray-100 shadow-sm focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200/50 dark:focus:ring-indigo-800/50 transition-all duration-200 placeholder:text-slate-400 dark:placeholder:text-gray-500"
                type="text"
                placeholder="your_username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">3-20 characters, letters, numbers, or underscores</p>
            </label>

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
              <span className="text-sm font-semibold text-slate-700 dark:text-gray-300">Password</span>
              <input
                className="mt-2 w-full rounded-lg border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700/50 px-4 py-3 text-slate-900 dark:text-gray-100 shadow-sm focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200/50 dark:focus:ring-indigo-800/50 transition-all duration-200 placeholder:text-slate-400 dark:placeholder:text-gray-500"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">Minimum 8 characters</p>
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700 dark:text-gray-300">Confirm Password</span>
              <input
                className="mt-2 w-full rounded-lg border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700/50 px-4 py-3 text-slate-900 dark:text-gray-100 shadow-sm focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200/50 dark:focus:ring-indigo-800/50 transition-all duration-200 placeholder:text-slate-400 dark:placeholder:text-gray-500"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
            </label>

            <button
              className="btn-primary w-full mt-6 hover:-translate-y-0.5 active:translate-y-0"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-gray-600" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white dark:bg-gray-800 px-3 text-slate-500 dark:text-gray-400">or sign up with</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleFacebookSignup}
            disabled={isFacebookSubmitting}
            className="w-full flex items-center justify-center gap-3 rounded-lg border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700/50 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 disabled:opacity-60"
          >
            <svg className="h-5 w-5 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            {isFacebookSubmitting ? 'Connecting...' : 'Continue with Facebook'}
          </button>

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
