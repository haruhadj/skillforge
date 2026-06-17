'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import {
  getAllAnnouncements,
  saveAnnouncement,
  deleteAnnouncement,
  AnnouncementInput,
} from '@/app/services/adminService'
import { Announcement } from '@/app/types'

const TYPE_STYLES: Record<string, string> = {
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  success: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
}

const EMPTY_FORM: AnnouncementInput = {
  title: '',
  message: '',
  type: 'info',
  active: true,
  sticky: false,
  linkUrl: '',
}

export default function AdminAnnouncementsTab() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Announcement | null>(null)
  const [form, setForm] = useState<AnnouncementInput>(EMPTY_FORM)
  const [showForm, setShowForm] = useState(false)

  const loadAnnouncements = async () => {
    try {
      setLoading(true)
      const data = await getAllAnnouncements()
      setAnnouncements(data)
    } catch (err) {
      console.error('Admin: Failed to load announcements', err)
      toast.error('Failed to load announcements')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAnnouncements() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.message.trim()) {
      toast.error('Title and message are required')
      return
    }
    try {
      setSaving(true)
      await saveAnnouncement(form)
      toast.success('Announcement posted')
      setForm(EMPTY_FORM)
      setShowForm(false)
      await loadAnnouncements()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save announcement')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id)
      await deleteAnnouncement(id)
      toast.success('Announcement deleted')
      setConfirmDelete(null)
      await loadAnnouncements()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete announcement')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Announcements</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">Manage platform-wide announcements</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-500 transition-colors"
        >
          {showForm ? 'Cancel' : '+ New Announcement'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="glass p-6 rounded-2xl space-y-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">New Announcement</h3>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Announcement title"
              className="w-full rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Message</label>
            <textarea
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              placeholder="Announcement message"
              rows={3}
              className="w-full rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Link URL <span className="text-slate-400 font-normal">(optional — opens in new tab)</span></label>
            <input
              type="url"
              value={form.linkUrl}
              onChange={(e) => setForm((f) => ({ ...f, linkUrl: e.target.value }))}
              placeholder="https://example.com"
              className="w-full rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-6 flex-wrap">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as AnnouncementInput['type'] }))}
                className="rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="success">Success</option>
              </select>
            </div>

            <div className="flex items-center gap-2 mt-5">
              <input
                id="active-toggle"
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="active-toggle" className="text-sm font-medium text-slate-700 dark:text-gray-300">
                Active
              </label>
            </div>

            <div className="flex items-center gap-2 mt-5">
              <input
                id="sticky-toggle"
                type="checkbox"
                checked={form.sticky}
                onChange={(e) => setForm((f) => ({ ...f, sticky: e.target.checked }))}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="sticky-toggle" className="text-sm font-medium text-slate-700 dark:text-gray-300">
                Sticky <span className="text-slate-400 font-normal text-xs">(users can&apos;t dismiss)</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-500 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Posting…' : 'Post Announcement'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl glass animate-pulse" />
          ))}
        </div>
      ) : announcements.length === 0 ? (
        <div className="glass p-8 text-center rounded-2xl">
          <p className="text-slate-500 dark:text-gray-400 text-sm">No announcements yet. Create one above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div key={a.id} className="glass p-5 rounded-2xl flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-900 dark:text-white text-sm">{a.title}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_STYLES[a.type] || TYPE_STYLES.info}`}>
                    {a.type}
                  </span>
                  {a.sticky && (
                    <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                      sticky
                    </span>
                  )}
                  {!a.active && (
                    <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-500 dark:bg-gray-700 dark:text-gray-400">
                      inactive
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-slate-600 dark:text-gray-300 line-clamp-2">{a.message}</p>
                {a.linkUrl && (
                  <a href={a.linkUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs text-indigo-600 dark:text-indigo-400 hover:underline truncate max-w-xs">
                    {a.linkUrl}
                  </a>
                )}
                <p className="mt-1 text-xs text-slate-400 dark:text-gray-500">
                  {a.createdAt ? new Date(a.createdAt as unknown as string).toLocaleString() : ''}
                </p>
              </div>
              <button
                onClick={() => setConfirmDelete(a)}
                disabled={deletingId === a.id}
                className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition-colors"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="glass rounded-2xl p-6 max-w-sm w-full space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Announcement?</h3>
            <p className="text-sm text-slate-600 dark:text-gray-300">
              &ldquo;{confirmDelete.title}&rdquo; will be permanently removed.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete.id)}
                disabled={deletingId === confirmDelete.id}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50 transition-colors"
              >
                {deletingId === confirmDelete.id ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
