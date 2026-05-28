'use client'
import { useEffect, useState, useCallback } from 'react'
import { Search, Link2, Link2Off, Plus, X, Shield, ChevronDown, ChevronUp } from 'lucide-react'
import { adminApi } from '@/lib/api'
import Spinner, { PageLoader } from '@/components/ui/Spinner'
import { useDebounce } from '@/lib/hooks'
import { usePermissions } from '@/lib/permissions-context'

const MANAGER_PERMISSIONS = [
  'approve_requests',
  'reject_requests',
  'manage_templates',
  'edit_pricing',
  'view_earnings',
  'view_requests',
]

function PermissionToggle({ perm, selected, onChange }: { perm: string; selected: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!selected)}
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all border ${
        selected
          ? 'bg-brand-purple/10 text-brand-purple border-brand-purple/30'
          : 'bg-white text-content-muted border-brand-purple/15 hover:border-brand-purple/30'
      }`}>
      {perm.replace(/_/g, ' ')}
    </button>
  )
}

interface AddLinkModalProps {
  celebrityId?: string
  onSaved: () => void
  onCancel: () => void
}

function AddLinkModal({ celebrityId: initialCelebId, onSaved, onCancel }: AddLinkModalProps) {
  const [celebId, setCelebId]           = useState(initialCelebId ?? '')
  const [adminId, setAdminId]           = useState('')
  const [permissions, setPermissions]   = useState<string[]>(['view_requests'])
  const [notes, setNotes]               = useState('')
  const [saving, setSaving]             = useState(false)
  const [error, setError]               = useState('')

  async function handleSave() {
    if (!celebId.trim()) { setError('Celebrity ID is required'); return }
    if (!adminId.trim()) { setError('Manager admin ID is required'); return }
    setSaving(true); setError('')
    try {
      await adminApi.addCelebrityManager(celebId.trim(), { admin_id: adminId.trim(), permissions, notes })
      onSaved()
    } catch (e: any) {
      setError(e.message || 'Failed to add manager')
    }
    setSaving(false)
  }

  function togglePerm(p: string) {
    setPermissions(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-start justify-between mb-5">
          <h2 className="text-lg font-bold text-content-primary">Link Manager</h2>
          <button onClick={onCancel} className="text-content-muted hover:text-content-primary"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-4">
          {!initialCelebId && (
            <div>
              <label className="block text-sm font-semibold text-content-primary mb-1.5">Celebrity ID</label>
              <input
                value={celebId}
                onChange={e => setCelebId(e.target.value)}
                placeholder="Paste celebrity UUID..."
                className="w-full rounded-xl border border-brand-purple/20 px-3 py-2.5 text-sm text-content-primary placeholder:text-content-muted outline-none focus:border-brand-purple" />
            </div>
          )}
          <div>
            <label className="block text-sm font-semibold text-content-primary mb-1.5">Manager Admin ID</label>
            <input
              value={adminId}
              onChange={e => setAdminId(e.target.value)}
              placeholder="Paste admin UUID..."
              className="w-full rounded-xl border border-brand-purple/20 px-3 py-2.5 text-sm text-content-primary placeholder:text-content-muted outline-none focus:border-brand-purple" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-content-primary mb-1.5">Permissions</label>
            <div className="flex flex-wrap gap-2">
              {MANAGER_PERMISSIONS.map(p => (
                <PermissionToggle key={p} perm={p} selected={permissions.includes(p)} onChange={v => togglePerm(p)} />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-content-primary mb-1.5">Notes <span className="text-content-muted font-normal">(optional)</span></label>
            <input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Primary manager for GCC campaigns"
              className="w-full rounded-xl border border-brand-purple/20 px-3 py-2.5 text-sm text-content-primary placeholder:text-content-muted outline-none focus:border-brand-purple" />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={onCancel} className="flex-1 px-4 py-2.5 rounded-xl border border-brand-purple/20 text-sm font-semibold text-content-secondary hover:bg-surface-subtle transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60 transition-colors"
            style={{ background: 'linear-gradient(135deg,#9a78fe,#422266)' }}>
            {saving ? <Spinner size="sm" /> : <Link2 className="w-4 h-4" />}
            Link Manager
          </button>
        </div>
      </div>
    </div>
  )
}

function LinkRow({ link, onUpdated, canManage }: { link: any; onUpdated: () => void; canManage: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [permissions, setPermissions] = useState<string[]>(link.permissions ?? [])

  async function handleToggleActive() {
    setSaving(true)
    try {
      await adminApi.updateCelebrityManager(link.celebrity_id, link.id, { is_active: !link.is_active, permissions })
      onUpdated()
    } catch {}
    setSaving(false)
  }

  async function handleSavePermissions() {
    setSaving(true)
    try {
      await adminApi.updateCelebrityManager(link.celebrity_id, link.id, { permissions, is_active: link.is_active })
      onUpdated()
    } catch {}
    setSaving(false)
  }

  async function handleRemove() {
    if (!confirm(`Remove ${link.admin?.name} as manager?`)) return
    setSaving(true)
    try {
      await adminApi.removeCelebrityManager(link.celebrity_id, link.id)
      onUpdated()
    } catch {}
    setSaving(false)
  }

  function togglePerm(p: string) {
    setPermissions(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
  }

  return (
    <div className={`border rounded-2xl transition-colors ${link.is_active ? 'border-brand-purple/15 bg-white' : 'border-red-100 bg-red-50/30'}`}>
      <div className="flex items-center gap-4 px-5 py-4">
        <div className="w-9 h-9 rounded-full bg-brand-purple/10 flex items-center justify-center text-sm font-bold text-brand-purple shrink-0">
          {link.admin?.name?.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-content-primary">{link.admin?.name}</p>
          <p className="text-xs text-content-muted">{link.admin?.email}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${link.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
            {link.is_active ? 'Active' : 'Inactive'}
          </span>
          {canManage && (
            <>
              <button onClick={() => setExpanded(e => !e)} className="text-content-muted hover:text-content-primary transition-colors">
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              <button
                onClick={handleToggleActive}
                disabled={saving}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                  link.is_active ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}>
                {saving ? <Spinner size="sm" /> : link.is_active ? <Link2Off className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                {link.is_active ? 'Deactivate' : 'Reactivate'}
              </button>
              <button onClick={handleRemove} disabled={saving} className="text-red-500 hover:text-red-700 transition-colors p-1.5 rounded-lg hover:bg-red-50">
                <X className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {expanded && (
        <div className="px-5 pb-4 border-t border-brand-purple/8 pt-4">
          <p className="text-xs font-semibold text-content-muted mb-2 uppercase tracking-wide">Permissions</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {MANAGER_PERMISSIONS.map(p => (
              <PermissionToggle key={p} perm={p} selected={permissions.includes(p)} onChange={() => togglePerm(p)} />
            ))}
          </div>
          {link.notes && <p className="text-xs text-content-muted mb-3">Notes: {link.notes}</p>}
          <button
            onClick={handleSavePermissions}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg,#9a78fe,#422266)' }}>
            {saving ? <Spinner size="sm" /> : <Shield className="w-4 h-4" />}
            Save Permissions
          </button>
        </div>
      )}
    </div>
  )
}

export default function CelebrityManagersPage() {
  const [links, setLinks]       = useState<any[]>([])
  const [total, setTotal]       = useState(0)
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [page, setPage]         = useState(1)
  const [showAdd, setShowAdd]       = useState(false)
  const [addCelebId, setAddCelebId] = useState<string | undefined>(undefined)
  const limit = 20

  const permissions = usePermissions()
  const canManage   = permissions.includes('celebrity_managers.manage')

  const debouncedSearch = useDebounce(search, 300)

  const fetchLinks = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (debouncedSearch) params.set('search', debouncedSearch)
    adminApi.managerLinks(params.toString())
      .then((res: any) => { setLinks(res.data || []); setTotal(res.total || 0) })
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [debouncedSearch, page])

  useEffect(() => { setPage(1) }, [debouncedSearch])
  useEffect(() => { fetchLinks() }, [fetchLinks])

  // Group links by celebrity
  const byCelebrity: Record<string, { celebrity: any; links: any[] }> = {}
  for (const link of links) {
    const cid = link.celebrity?.id
    if (!byCelebrity[cid]) byCelebrity[cid] = { celebrity: link.celebrity, links: [] }
    byCelebrity[cid].links.push(link)
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="p-8">
      {showAdd && (
        <AddLinkModal
          celebrityId={addCelebId}
          onSaved={() => { setShowAdd(false); setAddCelebId(undefined); fetchLinks() }}
          onCancel={() => { setShowAdd(false); setAddCelebId(undefined) }}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-purple/10 flex items-center justify-center">
            <Link2 className="w-5 h-5 text-brand-purple" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-content-primary">Celebrity Managers</h1>
            <p className="text-sm text-content-muted mt-0.5">{total} manager links across all celebrities</p>
          </div>
        </div>
        {canManage && (
          <button
            onClick={() => { setAddCelebId(undefined); setShowAdd(true) }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold"
            style={{ background: 'linear-gradient(135deg,#9a78fe,#422266)' }}>
            <Plus className="w-4 h-4" />
            Link Manager
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative">
          <Search className="w-4 h-4 text-content-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search celebrity or manager..."
            className="pl-9 pr-4 py-2 rounded-xl border border-brand-purple/20 text-sm outline-none focus:border-brand-purple bg-white text-content-primary placeholder:text-content-muted w-64 transition-colors" />
        </div>
      </div>

      {loading && <PageLoader />}

      {!loading && Object.keys(byCelebrity).length === 0 && (
        <div className="bg-white rounded-2xl border border-brand-purple/12 p-8 text-center">
          <p className="text-sm text-content-muted">No manager links found</p>
        </div>
      )}

      <div className="space-y-6">
        {Object.values(byCelebrity).map(({ celebrity, links: cLinks }) => (
          <div key={celebrity.id} className="bg-white rounded-2xl border border-brand-purple/12 shadow-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-brand-purple/8">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-surface-subtle flex items-center justify-center text-sm font-bold text-brand-purple">
                  {celebrity.name?.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-bold text-content-primary">{celebrity.name}</p>
                  <p className="text-xs text-content-muted">{cLinks.length} manager{cLinks.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              {canManage && (
                <button
                  onClick={() => { setAddCelebId(celebrity.id as string); setShowAdd(true) }}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all text-white"
                  style={{ background: 'linear-gradient(135deg,#9a78fe,#422266)' }}>
                  <Plus className="w-3.5 h-3.5" />
                  Add Manager
                </button>
              )}
            </div>
            <div className="p-4 space-y-3">
              {cLinks.map(link => (
                <LinkRow key={link.id} link={link} onUpdated={fetchLinks} canManage={canManage} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-content-muted">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
              className="px-4 py-2 rounded-xl border border-brand-purple/20 text-sm font-semibold text-content-secondary disabled:opacity-40 hover:bg-surface-subtle transition-colors">
              Previous
            </button>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
              className="px-4 py-2 rounded-xl border border-brand-purple/20 text-sm font-semibold text-content-secondary disabled:opacity-40 hover:bg-surface-subtle transition-colors">
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
