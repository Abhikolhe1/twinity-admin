'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { Search, Link2, Link2Off, Plus, X, Shield, ChevronDown, Check } from 'lucide-react'
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

type CelebrityOption = {
  id: string
  name: string
  thumbnail_url?: string | null
}

type ManagerOption = {
  id: string
  name: string
  email: string
  phone?: string | null
  agency_name?: string | null
}

type ManagerLink = {
  id: string
  celebrity_id: string
  permissions: string[]
  is_active: boolean
  notes?: string | null
  celebrity?: {
    id: string
    name: string
    thumbnail_url?: string | null
    is_active?: boolean
  }
  manager?: ManagerOption
}

function PermissionToggle({ perm, selected, onChange }: { perm: string; selected: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!selected)}
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all border ${
        selected
          ? 'bg-brand-purple/10 text-brand-purple border-brand-purple/30'
          : 'bg-white text-content-muted border-brand-purple/15 hover:border-brand-purple/30'
      }`}
    >
      {perm.replace(/_/g, ' ')}
    </button>
  )
}

function MultiCelebrityPicker({
  celebrities,
  selected,
  onToggle,
}: {
  celebrities: CelebrityOption[]
  selected: string[]
  onToggle: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const selectedCelebrities = celebrities.filter((celebrity) => selected.includes(celebrity.id))

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-[50px] w-full items-center justify-between gap-3 rounded-xl border border-brand-purple/20 bg-white px-3 py-2.5 text-left"
      >
        <div className="flex min-w-0 flex-wrap gap-2">
          {selectedCelebrities.length === 0 ? (
            <span className="text-sm text-content-muted">Select celebrities</span>
          ) : (
            selectedCelebrities.map((celebrity) => (
              <span key={celebrity.id} className="inline-flex items-center rounded-full bg-brand-purple/10 px-2.5 py-1 text-xs font-semibold text-brand-purple">
                {celebrity.name}
              </span>
            ))
          )}
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-content-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 rounded-2xl border border-brand-purple/12 bg-white p-2 shadow-xl">
          <div className="max-h-60 overflow-y-auto">
            {celebrities.map((celebrity) => {
              const active = selected.includes(celebrity.id)
              return (
                <button
                  key={celebrity.id}
                  type="button"
                  onClick={() => onToggle(celebrity.id)}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm transition-all ${
                    active ? 'bg-brand-purple/8 text-brand-purple' : 'text-content-primary hover:bg-surface-subtle'
                  }`}
                >
                  <span className="truncate font-medium">{celebrity.name}</span>
                  {active && <Check className="h-4 w-4 shrink-0" />}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function AddLinkModal({
  managers,
  celebrities,
  initialCelebId,
  onSaved,
  onCancel,
}: {
  managers: ManagerOption[]
  celebrities: CelebrityOption[]
  initialCelebId?: string
  onSaved: () => void
  onCancel: () => void
}) {
  const [mode, setMode] = useState<'existing' | 'new'>(managers.length ? 'existing' : 'new')
  const [managerId, setManagerId] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [agencyName, setAgencyName] = useState('')
  const [celebrityIds, setCelebrityIds] = useState<string[]>(initialCelebId ? [initialCelebId] : [])
  const [permissions, setPermissions] = useState<string[]>(['view_requests'])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function toggleCelebrity(id: string) {
    setCelebrityIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id])
  }

  function togglePerm(permission: string) {
    setPermissions((current) => current.includes(permission) ? current.filter((value) => value !== permission) : [...current, permission])
  }

  async function handleSave() {
    if (celebrityIds.length === 0) {
      setError('Select at least one celebrity')
      return
    }
    if (permissions.length === 0) {
      setError('Select at least one manager permission')
      return
    }
    if (mode === 'existing' && !managerId) {
      setError('Select an existing manager')
      return
    }
    if (mode === 'new' && (!name.trim() || !email.trim())) {
      setError('Manager name and email are required')
      return
    }

    setSaving(true)
    setError('')
    try {
      await adminApi.createManager({
        manager_id: mode === 'existing' ? managerId : undefined,
        name: mode === 'new' ? name : undefined,
        email: mode === 'new' ? email : undefined,
        phone: mode === 'new' ? phone : undefined,
        agency_name: mode === 'new' ? agencyName : undefined,
        permissions,
        celebrity_ids: celebrityIds,
        notes,
      })
      onSaved()
    } catch (err: any) {
      setError(err.message || 'Failed to save manager links')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="max-h-[92vh] overflow-y-auto p-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-content-primary">Manager Access Setup</h2>
            <p className="text-sm text-content-muted mt-1">Create a manager or pick an existing one, then link the right celebrities.</p>
          </div>
          <button onClick={onCancel} className="text-content-muted hover:text-content-primary"><X className="w-5 h-5" /></button>
        </div>

        <div className="grid gap-4">
          <div className="flex gap-2">
            <button type="button" onClick={() => setMode('existing')} className={`px-4 py-2 rounded-xl text-sm font-semibold ${mode === 'existing' ? 'bg-brand-purple text-white' : 'border border-brand-purple/20 text-content-secondary'}`}>
              Existing manager
            </button>
            <button type="button" onClick={() => setMode('new')} className={`px-4 py-2 rounded-xl text-sm font-semibold ${mode === 'new' ? 'bg-brand-purple text-white' : 'border border-brand-purple/20 text-content-secondary'}`}>
              New manager
            </button>
          </div>

          {mode === 'existing' ? (
            <div>
              <label className="block text-sm font-semibold text-content-primary mb-1.5">Manager</label>
              <select
                value={managerId}
                onChange={(e) => setManagerId(e.target.value)}
                className="w-full rounded-xl border border-brand-purple/20 px-3 py-2.5 text-sm text-content-primary outline-none focus:border-brand-purple"
              >
                <option value="">Select manager</option>
                {managers.map((manager) => (
                  <option key={manager.id} value={manager.id}>
                    {manager.name} - {manager.email}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-content-primary mb-1.5">Manager name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-brand-purple/20 px-3 py-2.5 text-sm outline-none focus:border-brand-purple" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-content-primary mb-1.5">Manager email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-brand-purple/20 px-3 py-2.5 text-sm outline-none focus:border-brand-purple" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-content-primary mb-1.5">Phone</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-xl border border-brand-purple/20 px-3 py-2.5 text-sm outline-none focus:border-brand-purple" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-content-primary mb-1.5">Agency</label>
                <input value={agencyName} onChange={(e) => setAgencyName(e.target.value)} className="w-full rounded-xl border border-brand-purple/20 px-3 py-2.5 text-sm outline-none focus:border-brand-purple" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-content-primary mb-1.5">Linked celebrities</label>
            <MultiCelebrityPicker celebrities={celebrities} selected={celebrityIds} onToggle={toggleCelebrity} />
          </div>

          <div>
            <label className="block text-sm font-semibold text-content-primary mb-1.5">Permissions</label>
            <div className="flex flex-wrap gap-2">
              {MANAGER_PERMISSIONS.map((permission) => (
                <PermissionToggle key={permission} perm={permission} selected={permissions.includes(permission)} onChange={() => togglePerm(permission)} />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-content-primary mb-1.5">Notes</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional internal note" className="w-full rounded-xl border border-brand-purple/20 px-3 py-2.5 text-sm outline-none focus:border-brand-purple" />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="sticky bottom-0 mt-5 flex gap-3 bg-white pt-2">
          <button onClick={onCancel} className="flex-1 px-4 py-2.5 rounded-xl border border-brand-purple/20 text-sm font-semibold text-content-secondary hover:bg-surface-subtle transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60 transition-colors" style={{ background: 'linear-gradient(135deg,#9a78fe,#422266)' }}>
            {saving ? <Spinner size="sm" /> : <Link2 className="w-4 h-4" />}
            Save manager access
          </button>
        </div>
        </div>
      </div>
    </div>
  )
}

function LinkRow({ link, onUpdated, canManage }: { link: ManagerLink; onUpdated: () => void; canManage: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [permissions, setPermissions] = useState<string[]>(link.permissions ?? [])

  function togglePerm(permission: string) {
    setPermissions((current) => current.includes(permission) ? current.filter((value) => value !== permission) : [...current, permission])
  }

  async function handleToggleActive() {
    setSaving(true)
    try {
      await adminApi.updateCelebrityManager(link.celebrity_id, link.id, { is_active: !link.is_active, permissions })
      onUpdated()
    } finally {
      setSaving(false)
    }
  }

  async function handleSavePermissions() {
    setSaving(true)
    try {
      await adminApi.updateCelebrityManager(link.celebrity_id, link.id, { permissions, is_active: link.is_active })
      onUpdated()
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove() {
    if (!confirm(`Remove ${link.manager?.name || 'this manager'} from this celebrity?`)) return
    setSaving(true)
    try {
      await adminApi.removeCelebrityManager(link.celebrity_id, link.id)
      onUpdated()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={`border rounded-2xl transition-colors ${link.is_active ? 'border-brand-purple/15 bg-white' : 'border-red-100 bg-red-50/30'}`}>
      <div className="flex items-center gap-4 px-5 py-4">
        <div className="w-9 h-9 rounded-full bg-brand-purple/10 flex items-center justify-center text-sm font-bold text-brand-purple shrink-0">
          {link.manager?.name?.charAt(0) || 'M'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-content-primary">{link.manager?.name}</p>
          <p className="text-xs text-content-muted">{link.manager?.email}</p>
          {link.manager?.agency_name && <p className="text-[11px] text-content-muted mt-1">{link.manager.agency_name}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${link.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
            {link.is_active ? 'Active' : 'Inactive'}
          </span>
          {canManage && (
            <>
              <button onClick={() => setExpanded((value) => !value)} className="text-content-muted hover:text-content-primary transition-colors text-xs font-semibold">
                {expanded ? 'Hide' : 'Edit'}
              </button>
              <button onClick={handleToggleActive} disabled={saving} className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${link.is_active ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
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
            {MANAGER_PERMISSIONS.map((permission) => (
              <PermissionToggle key={permission} perm={permission} selected={permissions.includes(permission)} onChange={() => togglePerm(permission)} />
            ))}
          </div>
          {link.notes && <p className="text-xs text-content-muted mb-3">Notes: {link.notes}</p>}
          <button onClick={handleSavePermissions} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-60" style={{ background: 'linear-gradient(135deg,#9a78fe,#422266)' }}>
            {saving ? <Spinner size="sm" /> : <Shield className="w-4 h-4" />}
            Save Permissions
          </button>
        </div>
      )}
    </div>
  )
}

export default function CelebrityManagersPage() {
  const [links, setLinks] = useState<ManagerLink[]>([])
  const [managers, setManagers] = useState<ManagerOption[]>([])
  const [celebrities, setCelebrities] = useState<CelebrityOption[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showAdd, setShowAdd] = useState(false)
  const [addCelebId, setAddCelebId] = useState<string | undefined>(undefined)
  const limit = 20

  const permissions = usePermissions()
  const canManage = permissions.includes('celebrity_managers.manage')
  const debouncedSearch = useDebounce(search, 300)

  const fetchLinks = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (debouncedSearch) params.set('search', debouncedSearch)
    Promise.all([
      adminApi.managerLinks(params.toString()),
      adminApi.managers(),
      adminApi.celebrities('limit=200'),
    ])
      .then(([linkRes, managerRes, celebRes]: any[]) => {
        setLinks(linkRes.data || [])
        setTotal(linkRes.total || 0)
        setManagers(managerRes.data || [])
        setCelebrities((celebRes.data || []).map((item: any) => ({
          id: item.id,
          name: item.name,
          thumbnail_url: item.thumbnail_url,
        })))
      })
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [debouncedSearch, page])

  useEffect(() => { setPage(1) }, [debouncedSearch])
  useEffect(() => { fetchLinks() }, [fetchLinks])

  const byCelebrity: Record<string, { celebrity: CelebrityOption; links: ManagerLink[] }> = {}
  for (const link of links) {
    const celebrity = link.celebrity
    if (!celebrity) continue
    if (!byCelebrity[celebrity.id]) {
      byCelebrity[celebrity.id] = { celebrity, links: [] }
    }
    byCelebrity[celebrity.id].links.push(link)
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="p-8">
      {showAdd && (
        <AddLinkModal
          managers={managers}
          celebrities={celebrities}
          initialCelebId={addCelebId}
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
          <button onClick={() => { setAddCelebId(undefined); setShowAdd(true) }} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold" style={{ background: 'linear-gradient(135deg,#9a78fe,#422266)' }}>
            <Plus className="w-4 h-4" />
            Add manager access
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative">
          <Search className="w-4 h-4 text-content-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search celebrity or manager..."
            className="pl-9 pr-4 py-2 rounded-xl border border-brand-purple/20 text-sm outline-none focus:border-brand-purple bg-white text-content-primary placeholder:text-content-muted w-64 transition-colors"
          />
        </div>
      </div>

      {loading && <PageLoader />}

      {!loading && Object.keys(byCelebrity).length === 0 && (
        <div className="bg-white rounded-2xl border border-brand-purple/12 p-8 text-center">
          <p className="text-sm text-content-muted">No manager links found</p>
        </div>
      )}

      <div className="space-y-6">
        {Object.values(byCelebrity).map(({ celebrity, links: celebrityLinks }) => (
          <div key={celebrity.id} className="bg-white rounded-2xl border border-brand-purple/12 shadow-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-brand-purple/8">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-surface-subtle flex items-center justify-center text-sm font-bold text-brand-purple">
                  {celebrity.name?.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-bold text-content-primary">{celebrity.name}</p>
                  <p className="text-xs text-content-muted">{celebrityLinks.length} manager{celebrityLinks.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              {canManage && (
                <button onClick={() => { setAddCelebId(celebrity.id); setShowAdd(true) }} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all text-white" style={{ background: 'linear-gradient(135deg,#9a78fe,#422266)' }}>
                  <Plus className="w-3.5 h-3.5" />
                  Add Manager
                </button>
              )}
            </div>
            <div className="p-4 space-y-3">
              {celebrityLinks.map((link) => (
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
            <button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="px-4 py-2 rounded-xl border border-brand-purple/20 text-sm font-semibold text-content-secondary disabled:opacity-40 hover:bg-surface-subtle transition-colors">
              Previous
            </button>
            <button disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)} className="px-4 py-2 rounded-xl border border-brand-purple/20 text-sm font-semibold text-content-secondary disabled:opacity-40 hover:bg-surface-subtle transition-colors">
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
