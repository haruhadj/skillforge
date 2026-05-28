import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 gradient-bg transition-colors duration-500">
      <div className="glass rounded-2xl p-10 max-w-md w-full text-center shadow-xl">
        <p className="text-7xl font-black text-indigo-500 dark:text-indigo-400 leading-none">404</p>
        <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">Page not found</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-gray-400">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/library"
          className="mt-6 inline-block rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow hover:bg-indigo-500 transition-colors"
        >
          Back to Library
        </Link>
      </div>
    </div>
  )
}
