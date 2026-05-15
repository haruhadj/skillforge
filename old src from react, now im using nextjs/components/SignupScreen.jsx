import React, { useState } from 'react'
import toast from 'react-hot-toast'
import ThemeToggle from './ThemeToggle'

function SignupScreen({ onBack, onSubmit }) {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event) => {
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
      await onSubmit({ username: username.trim(), email, password })
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
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">Create Account</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-gray-400 font-350">Join SkillForge and start learning</p>
          
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
              <p className="mt-1 text-xs text-slate-500 dark:text-gray-400 font-350">3-20 characters, letters, numbers, or underscores</p>
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
              <p className="mt-1 text-xs text-slate-500 dark:text-gray-400 font-350">Minimum 8 characters</p>
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

          <button
            className="btn-secondary w-full mt-4 hover:-translate-y-0.5 active:translate-y-0"
            onClick={onBack}
            disabled={isSubmitting}
            type="button"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  )
}

export default SignupScreen

