import { useState } from 'react'
import { Link } from 'react-router-dom'
import { createEntry, deleteEntry, updateEntry } from '../api/entries'
import { useAuth } from '../hooks/useAuth'
import { useEntries } from '../hooks/useEntries'
import type { Entry } from '../types'

const CATEGORIES = ['Spell', 'Class', 'Subclass', 'Species', 'Monster', 'Magic Item', 'Equipment', 'Feat', 'Background']

interface EntryForm {
  name: string
  category: string
  url: string
}

const EMPTY_FORM: EntryForm = { name: '', category: 'Spell', url: '' }

function LoginGate({ onLogin }: { onLogin: (password: string) => Promise<void> }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await onLogin(password)
    } catch {
      setError('Incorrect password')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-warm-bg text-warm-text flex items-center justify-center">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center">Admin Login</h1>
        <form onSubmit={handleSubmit} className="bg-warm-surface border border-warm-border rounded-xl p-6 flex flex-col gap-4">
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoFocus
            required
            className="bg-warm-input border border-warm-border rounded px-3 py-2 text-sm text-warm-text placeholder-warm-muted focus:border-warm-accent focus:outline-none transition-colors duration-150"
          />
          {error && <p className="text-warm-error text-xs">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="bg-warm-accent hover:opacity-90 disabled:opacity-50 text-white rounded px-3 py-2 text-sm font-medium transition-opacity duration-150"
          >
            {submitting ? 'Logging in…' : 'Log in'}
          </button>
        </form>
      </div>
    </div>
  )
}

export function AdminPage() {
  const { token, isAuthenticated, loading: authLoading, login, logout } = useAuth()
  const { entries, loading, error, reload } = useEntries()
  const [filter, setFilter] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<EntryForm>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  if (authLoading) {
    return (
      <div className="min-h-screen bg-warm-bg text-warm-text flex items-center justify-center">
        <p className="text-warm-muted">Loading…</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginGate onLogin={login} />
  }

  const filtered = filter
    ? entries.filter(e => e.category === filter)
    : entries

  function startEdit(entry: Entry) {
    setEditingId(entry.id)
    setForm({ name: entry.name, category: entry.category, url: entry.url })
    setFormError(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return
    setSubmitting(true)
    setFormError(null)
    try {
      if (editingId !== null) {
        await updateEntry(editingId, form, token)
      } else {
        await createEntry(form, token)
      }
      cancelEdit()
      reload()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: number) {
    if (!token) return
    if (!confirm('Delete this entry?')) return
    try {
      await deleteEntry(id, token)
      reload()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  return (
    <div className="min-h-screen bg-warm-bg text-warm-text p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Admin — Entries</h1>
          <div className="flex items-center gap-4">
            <Link to="/" className="text-sm text-warm-accent hover:opacity-80 transition-opacity">← Search</Link>
            <button
              onClick={logout}
              className="text-sm text-warm-muted hover:text-warm-text transition-colors duration-150"
            >
              Log out
            </button>
          </div>
        </div>

        {/* Add / Edit form */}
        <form onSubmit={handleSubmit} className="bg-warm-surface border border-warm-border rounded-xl p-4 mb-6 grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input
            type="text"
            placeholder="Name"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            required
            className="bg-warm-input border border-warm-border rounded px-3 py-2 text-sm text-warm-text placeholder-warm-muted focus:border-warm-accent focus:outline-none transition-colors duration-150 col-span-1"
          />
          <select
            value={form.category}
            onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            className="bg-warm-input border border-warm-border rounded px-3 py-2 text-sm text-warm-text focus:border-warm-accent focus:outline-none transition-colors duration-150 col-span-1"
          >
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <input
            type="url"
            placeholder="URL"
            value={form.url}
            onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
            required
            className="bg-warm-input border border-warm-border rounded px-3 py-2 text-sm text-warm-text placeholder-warm-muted focus:border-warm-accent focus:outline-none transition-colors duration-150 col-span-1 sm:col-span-1"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-warm-accent hover:opacity-90 disabled:opacity-50 text-white rounded px-3 py-2 text-sm font-medium transition-opacity duration-150"
            >
              {editingId !== null ? 'Update' : 'Add'}
            </button>
            {editingId !== null && (
              <button
                type="button"
                onClick={cancelEdit}
                className="bg-warm-hover hover:bg-warm-border text-warm-text rounded px-3 py-2 text-sm transition-colors duration-150"
              >
                Cancel
              </button>
            )}
          </div>
          {formError && <p className="col-span-full text-warm-error text-xs">{formError}</p>}
        </form>

        {/* Filter */}
        <div className="mb-4 flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter('')}
            className={`text-xs px-3 py-1 rounded-full transition-colors duration-150 ${!filter ? 'bg-warm-accent text-white' : 'bg-warm-surface border border-warm-border text-warm-muted hover:bg-warm-hover'}`}
          >
            All ({entries.length})
          </button>
          {CATEGORIES.map(c => {
            const count = entries.filter(e => e.category === c).length
            return (
              <button
                key={c}
                onClick={() => setFilter(c)}
                className={`text-xs px-3 py-1 rounded-full transition-colors duration-150 ${filter === c ? 'bg-warm-accent text-white' : 'bg-warm-surface border border-warm-border text-warm-muted hover:bg-warm-hover'}`}
              >
                {c} ({count})
              </button>
            )
          })}
        </div>

        {loading ? (
          <p className="text-warm-muted">Loading...</p>
        ) : error ? (
          <p className="text-warm-error">Error: {error}</p>
        ) : (
          <div className="overflow-x-auto rounded-xl bg-warm-surface border border-warm-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-warm-muted text-xs uppercase border-b border-warm-border">
                  <th className="text-left px-4 py-3">Name</th>
                  <th className="text-left px-4 py-3">Category</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">URL</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-divider">
                {filtered.map(entry => (
                  <tr key={entry.id} className={`transition-colors duration-150 ${editingId === entry.id ? 'bg-warm-hover' : 'hover:bg-warm-hover'}`}>
                    <td className="px-4 py-2 font-medium text-warm-text">{entry.name}</td>
                    <td className="px-4 py-2 text-warm-muted">{entry.category}</td>
                    <td className="px-4 py-2 hidden md:table-cell">
                      <a
                        href={entry.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-warm-accent hover:opacity-80 truncate max-w-xs block transition-opacity"
                      >
                        {entry.url}
                      </a>
                    </td>
                    <td className="px-4 py-2 text-right space-x-2">
                      <button
                        onClick={() => startEdit(entry)}
                        className="text-xs text-warm-accent hover:opacity-80 transition-opacity"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="text-xs text-warm-error hover:opacity-80 transition-opacity"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <p className="text-center text-warm-muted py-8">No entries</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
