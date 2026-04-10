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
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-gray-950 transition-colors duration-300">
      <div className="absolute top-5 right-5">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md rounded-3xl bg-white dark:bg-gray-800 p-10 shadow-xl dark:shadow-2xl dark:shadow-black/30 border border-transparent dark:border-gray-700/50">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Create Account</h2>
        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-gray-300">Username</span>
            <input
              className="mt-2 w-full rounded-xl border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-slate-900 dark:text-gray-100 shadow-sm focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 transition-colors duration-200 placeholder:text-slate-400 dark:placeholder:text-gray-500"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-gray-300">Email</span>
            <input
              className="mt-2 w-full rounded-xl border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-slate-900 dark:text-gray-100 shadow-sm focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 transition-colors duration-200 placeholder:text-slate-400 dark:placeholder:text-gray-500"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-gray-300">Password</span>
            <input
              className="mt-2 w-full rounded-xl border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-slate-900 dark:text-gray-100 shadow-sm focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 transition-colors duration-200 placeholder:text-slate-400 dark:placeholder:text-gray-500"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-gray-300">Confirm Password</span>
            <input
              className="mt-2 w-full rounded-xl border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-slate-900 dark:text-gray-100 shadow-sm focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 transition-colors duration-200 placeholder:text-slate-400 dark:placeholder:text-gray-500"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
          </label>

          <button
            className="w-full rounded-xl bg-indigo-600 dark:bg-indigo-500 px-5 py-3.5 text-white font-medium transition-all duration-200 hover:bg-indigo-700 disabled:opacity-70 disabled:cursor-not-allowed dark:hover:bg-indigo-400 hover:shadow-lg hover:shadow-indigo-500/25 focus:outline-none focus:ring-4 focus:ring-indigo-200 dark:focus:ring-indigo-800"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <button
          className="mt-4 w-full rounded-xl bg-slate-100 dark:bg-gray-700 px-5 py-3 text-slate-700 dark:text-gray-300 font-medium transition-colors duration-200 hover:bg-slate-200 dark:hover:bg-gray-600"
          onClick={onBack}
          disabled={isSubmitting}
          type="button"
        >
          Back
        </button>
      </div>
    </div>
  )
}

export default SignupScreen

