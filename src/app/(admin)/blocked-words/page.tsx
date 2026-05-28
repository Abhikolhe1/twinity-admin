'use client'
import { useState, useEffect, useMemo } from 'react'
import { ShieldAlert, Plus, X, Loader2, AlertCircle, Search } from 'lucide-react'
import { adminApi } from '@/lib/api'
import { usePermissions } from '@/lib/permissions-context'

export default function BlockedWordsPage() {
  const permissions = usePermissions()
  const canManage = permissions.includes('settings.manage')

  const [words,   setWords]   = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [newWord, setNewWord] = useState('')
  const [adding,  setAdding]  = useState(false)
  const [error,   setError]   = useState('')
  const [search,  setSearch]  = useState('')

  useEffect(() => {
    adminApi.getBlockedWords()
      .then((res: unknown) => {
        const r = res as { success: boolean; data: string[] }
        setWords(r.data ?? [])
      })
      .catch(() => setError('Failed to load blocked words'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return words
    const q = search.toLowerCase()
    return words.filter(w => w.includes(q))
  }, [words, search])

  async function handleAdd() {
    const entries = newWord.split(',').map(w => w.trim().toLowerCase()).filter(Boolean)
    if (!entries.length) return
    setAdding(true)
    setError('')
    try {
      const res = await adminApi.addBlockedWord(entries) as { success: boolean; data: string[] }
      setWords(res.data)
      setNewWord('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add words')
    } finally {
      setAdding(false)
    }
  }

  async function handleRemove(word: string) {
    try {
      const res = await adminApi.removeBlockedWord(word) as { success: boolean; data: string[] }
      setWords(res.data)
    } catch {
      // ignore
    }
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-content-primary">Blocked Words</h1>
        <p className="text-sm text-content-muted mt-1">
          Words that are prohibited in customer video scripts. Customers will see a warning and cannot submit until the script is revised.
        </p>
      </div>

      {error && (
        <div className="mb-5 flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-brand-purple/12 shadow-card overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-brand-purple/8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg,#9a78fe,#422266)' }}
            >
              <ShieldAlert className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-content-primary">Content Moderation</p>
              <p className="text-xs text-content-muted mt-0.5">{words.length} word{words.length !== 1 ? 's' : ''} blocked</p>
            </div>
          </div>
        </div>

        <div className="p-6 flex flex-col gap-5">
          {/* Info banner */}
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-700 leading-relaxed">
            Words are matched case-insensitively as substrings. The script is also validated server-side before the video job is created.
          </div>

          {/* Add + Search row */}
          <div className="flex gap-3 flex-wrap">
            {canManage && (
              <div className="flex gap-2 flex-1 min-w-60">
                <input
                  type="text"
                  value={newWord}
                  onChange={e => setNewWord(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd() } }}
                  placeholder="Shit, Bitch — press Enter to add all"
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-brand-purple/20 text-sm outline-none focus:border-brand-purple focus:shadow-[0_0_0_3px_rgba(154,120,254,0.10)] bg-white text-content-primary placeholder:text-content-muted transition-all"
                />
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={adding || !newWord.trim()}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:opacity-90 shrink-0"
                  style={{ background: 'linear-gradient(135deg,#9a78fe,#422266)' }}
                >
                  {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Add
                </button>
              </div>
            )}

            {/* Search */}
            {words.length > 0 && (
              <div className="relative min-w-52">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search & remove..."
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-brand-purple/20 text-sm outline-none focus:border-brand-purple focus:shadow-[0_0_0_3px_rgba(154,120,254,0.10)] bg-white text-content-primary placeholder:text-content-muted transition-all"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-content-muted hover:text-brand-purple transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Word list */}
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-brand-purple" />
            </div>
          ) : words.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
              <ShieldAlert className="w-8 h-8 text-content-muted/40" />
              <p className="text-sm text-content-muted">No blocked words yet.</p>
              <p className="text-xs text-content-muted">Add words above to start filtering scripts.</p>
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center py-8 text-sm text-content-muted">No words match &ldquo;{search}&rdquo;</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {filtered.map(word => (
                <span
                  key={word}
                  className="flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full text-sm font-medium bg-red-50 text-red-600 border border-red-200"
                >
                  {word}
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => handleRemove(word)}
                      className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-red-200 transition-colors"
                      title="Remove"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
