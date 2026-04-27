import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { deleteGame, getGameRegistry, saveGame } from '../services/adminService'
import { defaultGames } from '../games/games'

const EMPTY_FORM = { id: '', name: '', description: '', iframePath: '', enabled: true }

export default function AdminGamesTab() {
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const loadGames = async () => {
    try {
      setLoading(true)
      const firestoreGames = await getGameRegistry()
      // Merge: show all defaults + any Firestore-only entries
      const merged = new Map()
      for (const g of defaultGames) merged.set(g.id, { ...g, source: 'default' })
      for (const g of firestoreGames) merged.set(g.id, { ...merged.get(g.id), ...g, source: 'firestore' })
      setGames(Array.from(merged.values()))
    } catch {
      setGames(defaultGames.map((g) => ({ ...g, source: 'default' })))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadGames() }, [])

  const openAddForm = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  const openEditForm = (game) => {
    setEditingId(game.id)
    setForm({
      id: game.id,
      name: game.name || '',
      description: game.description || '',
      iframePath: game.iframePath || '',
      enabled: game.enabled !== false,
    })
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.id.trim() || !form.name.trim()) {
      toast.error('Game ID and Name are required')
      return
    }

    const gameId = form.id.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-')
    const iframePath = form.iframePath.trim() || `/games/${gameId}/index.html`

    try {
      setSaving(true)
      await saveGame({
        id: gameId,
        name: form.name.trim(),
        description: form.description.trim(),
        iframePath,
        enabled: form.enabled,
      })
      toast.success(editingId ? 'Game updated' : 'Game added')
      setShowForm(false)
      setForm(EMPTY_FORM)
      setEditingId(null)
      await loadGames()
    } catch (err) {
      toast.error(`Failed to save: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (gameId) => {
    try {
      await deleteGame(gameId)
      toast.success('Game removed')
      setConfirmDelete(null)
      await loadGames()
    } catch (err) {
      toast.error(`Failed to delete: ${err.message}`)
    }
  }

  const toggleEnabled = async (game) => {
    try {
      await saveGame({ id: game.id, enabled: game.enabled === false })
      toast.success(`${game.name} ${game.enabled === false ? 'enabled' : 'disabled'}`)
      await loadGames()
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Game Management</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">{games.length} games registered</p>
        </div>
        <button type="button" className="btn-primary flex items-center gap-2 w-fit" onClick={openAddForm}>
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" /></svg>
          Add Game
        </button>
      </div>

      {/* Add / Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {editingId ? 'Edit Game' : 'Add New Game'}
              </h3>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-gray-800 hover:text-slate-700 dark:hover:text-white transition-colors">
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M4.22 4.22a.75.75 0 011.06 0L10 8.94l4.72-4.72a.75.75 0 111.06 1.06L11.06 10l4.72 4.72a.75.75 0 11-1.06 1.06L10 11.06l-4.72 4.72a.75.75 0 01-1.06-1.06L8.94 10 4.22 5.28a.75.75 0 010-1.06z" /></svg>
              </button>
            </div>
            <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
              <label className="block">
                <span className="text-sm font-medium text-slate-700 dark:text-gray-300">Game ID <span className="text-xs text-slate-400">(kebab-case, e.g. my-game)</span></span>
                <input className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-slate-900 dark:text-gray-100 shadow-sm focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 transition-colors placeholder:text-slate-400 dark:placeholder:text-gray-500" value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} disabled={!!editingId} required placeholder="my-new-game" />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700 dark:text-gray-300">Display Name</span>
                <input className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-slate-900 dark:text-gray-100 shadow-sm focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 transition-colors placeholder:text-slate-400 dark:placeholder:text-gray-500" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="My New Game" />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700 dark:text-gray-300">Description</span>
                <textarea className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-slate-900 dark:text-gray-100 shadow-sm focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 transition-colors placeholder:text-slate-400 dark:placeholder:text-gray-500 resize-none" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="A short description of the game..." />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700 dark:text-gray-300">Iframe Path <span className="text-xs text-slate-400">(auto-generated if empty)</span></span>
                <input className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-slate-900 dark:text-gray-100 shadow-sm focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 transition-colors placeholder:text-slate-400 dark:placeholder:text-gray-500" value={form.iframePath} onChange={(e) => setForm({ ...form, iframePath: e.target.value })} placeholder="/games/my-new-game/index.html" />
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="h-5 w-5 rounded border-slate-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 accent-indigo-600" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
                <span className="text-sm font-medium text-slate-700 dark:text-gray-300">Enabled (visible in library)</span>
              </label>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1" disabled={saving}>
                  {saving ? 'Saving...' : editingId ? 'Update Game' : 'Add Game'}
                </button>
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
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Game</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-gray-400">
              Remove <strong>{confirmDelete.name}</strong> from the registry? This only removes the Firestore entry; files in <code className="text-xs bg-slate-100 dark:bg-gray-800 px-1 py-0.5 rounded">public/games/</code> are not affected.
            </p>
            <div className="mt-5 flex gap-3">
              <button type="button" className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-200 dark:focus:ring-red-800" onClick={() => handleDelete(confirmDelete.id)}>Delete</button>
              <button type="button" className="btn-secondary flex-1" onClick={() => setConfirmDelete(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Games Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-16 rounded-xl glass animate-pulse" />)}
        </div>
      ) : (
        <div className="glass overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-gray-700/80">
                  <th className="px-5 py-4 font-semibold text-slate-500 dark:text-gray-400 uppercase text-xs tracking-wide">Game</th>
                  <th className="px-5 py-4 font-semibold text-slate-500 dark:text-gray-400 uppercase text-xs tracking-wide hidden sm:table-cell">Path</th>
                  <th className="px-5 py-4 font-semibold text-slate-500 dark:text-gray-400 uppercase text-xs tracking-wide">Status</th>
                  <th className="px-5 py-4 font-semibold text-slate-500 dark:text-gray-400 uppercase text-xs tracking-wide text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
                {games.map((game) => (
                  <tr key={game.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900 dark:text-white">{game.name}</p>
                      <p className="text-xs text-slate-400 dark:text-gray-500 mt-0.5">{game.id}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-500 dark:text-gray-400 text-xs font-mono hidden sm:table-cell">{game.iframePath}</td>
                    <td className="px-5 py-4">
                      <button type="button" onClick={() => toggleEnabled(game)} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${game.enabled === false ? 'bg-slate-100 dark:bg-gray-800 text-slate-500 dark:text-gray-400' : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400'}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${game.enabled === false ? 'bg-slate-400' : 'bg-emerald-500'}`} />
                        {game.enabled === false ? 'Disabled' : 'Active'}
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button type="button" onClick={() => openEditForm(game)} className="rounded-lg p-2 text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors" title="Edit">
                          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                        </button>
                        <button type="button" onClick={() => setConfirmDelete(game)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition-colors" title="Delete">
                          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
