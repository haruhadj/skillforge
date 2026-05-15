import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { deleteAnnouncement, getAllAnnouncements, saveAnnouncement } from '../services/adminService'

const TYPE_OPTIONS = [
  { value: 'info', label: 'Info', color: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400' },
  { value: 'warning', label: 'Warning', color: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400' },
  { value: 'success', label: 'Success', color: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400' },
]

const EMPTY_FORM = { title: '', message: '', type: 'info', active: true }

export default function AdminAnnouncementsTab() {
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const loadAnnouncements = async () => {
    try {
      setLoading(true)
      const data = await getAllAnnouncements()
      setAnnouncements(data)
    } catch {
      toast.error('Failed to load announcements')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAnnouncements() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) {
      toast.error('Title is required')
      return
    }
    try {
      setSaving(true)
      await saveAnnouncement(form)
      toast.success('Announcement created')
      setShowForm(false)
      setForm(EMPTY_FORM)
      await loadAnnouncements()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteAnnouncement(id)
      toast.success('Announcement deleted')
      setConfirmDelete(null)
      await loadAnnouncements()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleToggleActive = async (ann) => {
    try {
      await saveAnnouncement({ ...ann, active: !ann.active })
      toast.success(ann.active ? 'Announcement hidden' : 'Announcement activated')
      await loadAnnouncements()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const getTypeStyle = (type) => TYPE_OPTIONS.find((t) => t.value === type)?.color || TYPE_OPTIONS[0].color

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Announcements</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">Broadcast messages to all users</p>
        </div>
        <button type="button" className="btn-primary flex items-center gap-2 w-fit" onClick={() => { setForm(EMPTY_FORM); setShowForm(true) }}>
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" /></svg>
          New Announcement
        </button>
      </div>

      {/* Create form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">New Announcement</h3>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-gray-800 hover:text-slate-700 dark:hover:text-white transition-colors">
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M4.22 4.22a.75.75 0 011.06 0L10 8.94l4.72-4.72a.75.75 0 111.06 1.06L11.06 10l4.72 4.72a.75.75 0 11-1.06 1.06L10 11.06l-4.72 4.72a.75.75 0 01-1.06-1.06L8.94 10 4.22 5.28a.75.75 0 010-1.06z" /></svg>
              </button>
            </div>
            <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
              <label className="block">
                <span className="text-sm font-medium text-slate-700 dark:text-gray-300">Title</span>
                <input className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-slate-900 dark:text-gray-100 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 transition-colors placeholder:text-slate-400 dark:placeholder:text-gray-500" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="Maintenance scheduled..." />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700 dark:text-gray-300">Message</span>
                <textarea className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-slate-900 dark:text-gray-100 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 transition-colors placeholder:text-slate-400 dark:placeholder:text-gray-500 resize-none" rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Additional details..." />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700 dark:text-gray-300">Type</span>
                <select className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-slate-900 dark:text-gray-100 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 transition-colors" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {TYPE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="h-5 w-5 rounded border-slate-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 accent-indigo-600" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                <span className="text-sm font-medium text-slate-700 dark:text-gray-300">Active (visible to users)</span>
              </label>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Posting...' : 'Post Announcement'}</button>
                <button type="button" className="btn-secondary flex-1" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-red-200 dark:border-red-800 bg-white dark:bg-gray-900 p-6 shadow-2xl animate-scale-in">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Announcement</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-gray-400">
              Delete &ldquo;<strong>{confirmDelete.title}</strong>&rdquo;? This cannot be undone.
            </p>
            <div className="mt-5 flex gap-3">
              <button type="button" className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-200 dark:focus:ring-red-800" onClick={() => handleDelete(confirmDelete.id)}>Delete</button>
              <button type="button" className="btn-secondary flex-1" onClick={() => setConfirmDelete(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Announcements list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl glass animate-pulse" />)}
        </div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-16 text-slate-400 dark:text-gray-500">
          <svg className="mx-auto h-12 w-12 mb-3 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" />
          </svg>
          <p className="text-base font-medium">No announcements yet</p>
          <p className="text-sm mt-1">Create one to broadcast a message to all users.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((ann) => (
            <div key={ann.id} className={`glass p-5 transition-opacity ${!ann.active ? 'opacity-50' : ''}`}>
              <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold text-slate-900 dark:text-white">{ann.title}</h4>
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${getTypeStyle(ann.type)}`}>{ann.type}</span>
                    {!ann.active && (
                      <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold bg-slate-100 dark:bg-gray-800 text-slate-500 dark:text-gray-400">Hidden</span>
                    )}
                  </div>
                  {ann.message && <p className="mt-1 text-sm text-slate-600 dark:text-gray-400">{ann.message}</p>}
                  {ann.createdAt && (
                    <p className="mt-2 text-xs text-slate-400 dark:text-gray-500">
                      {ann.createdAt.toDate ? ann.createdAt.toDate().toLocaleString() : 'Just now'}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button type="button" onClick={() => handleToggleActive(ann)} className="rounded-lg px-3 py-2 text-xs font-medium text-slate-600 dark:text-gray-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                    {ann.active ? 'Hide' : 'Show'}
                  </button>
                  <button type="button" onClick={() => setConfirmDelete(ann)} className="rounded-lg px-3 py-2 text-xs font-medium text-slate-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
