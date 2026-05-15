import React from 'react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error) {
    console.error('Unhandled UI error:', error)
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-gray-950 p-6">
          <div className="max-w-md rounded-2xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-8 text-center shadow-lg">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Something went wrong</h1>
            <p className="mt-3 text-slate-600 dark:text-gray-300">
              SkillForge hit an unexpected error. Reload to continue.
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              className="mt-6 rounded-xl bg-indigo-600 px-5 py-3 font-medium text-white hover:bg-indigo-700"
            >
              Reload app
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
