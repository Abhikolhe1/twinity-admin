'use client'
import { Fragment, useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Search, Link2, Link2Off, Plus, X, Shield, ChevronDown, Check, Eye, Pencil, MoreHorizontal } from 'lucide-react'
import { adminApi } from '@/lib/api'
import Spinner, { PageLoader } from '@/components/ui/Spinner'
import { useDebounce } from '@/lib/hooks'
import { usePermissions } from '@/lib/permissions-context'
import ConfirmActionModal from '@/components/ConfirmActionModal'

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
  is_active?: boolean
  celebrity_links?: Array<{
    id: string
    is_active: boolean
    notes?: string | null
    celebrity: {
      id: string
      name: string
    }
    permissions: string[]
  }>
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
  initialManagerId,
  onSaved,
  onCancel,
}: {
  managers: ManagerOption[]
  celebrities: CelebrityOption[]
  initialCelebId?: string
  initialManagerId?: string
  onSaved: () => void
  onCancel: () => void
}) {
  const [mode, setMode] = useState<'existing' | 'new'>(initialManagerId || managers.length ? 'existing' : 'new')
  const [managerId, setManagerId] = useState(initialManagerId || '')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [agencyName, setAgencyName] = useState('')
  const [celebrityIds, setCelebrityIds] = useState<string[]>(initialCelebId ? [initialCelebId] : [])
  const [permissions, setPermissions] = useState<string[]>(['view_requests'])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function sanitizePhone(value: string) {
    return value.replace(/\D/g, '')
  }

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
    if (mode === 'new' && phone && !/^\d+$/.test(phone)) {
      setError('Manager phone must contain digits only')
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
          {!initialManagerId && (
            <div className="flex gap-2">
              <button type="button" onClick={() => setMode('existing')} className={`px-4 py-2 rounded-xl text-sm font-semibold ${mode === 'existing' ? 'bg-brand-purple text-white' : 'border border-brand-purple/20 text-content-secondary'}`}>
                Existing manager
              </button>
              <button type="button" onClick={() => setMode('new')} className={`px-4 py-2 rounded-xl text-sm font-semibold ${mode === 'new' ? 'bg-brand-purple text-white' : 'border border-brand-purple/20 text-content-secondary'}`}>
                New manager
              </button>
            </div>
          )}

          {mode === 'existing' ? (
            <div>
              <label className="block text-sm font-semibold text-content-primary mb-1.5">Manager</label>
              <select
                value={managerId}
                onChange={(e) => setManagerId(e.target.value)}
                disabled={Boolean(initialManagerId)}
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
                <input value={phone} onChange={(e) => setPhone(sanitizePhone(e.target.value))} inputMode="numeric" className="w-full rounded-xl border border-brand-purple/20 px-3 py-2.5 text-sm outline-none focus:border-brand-purple" />
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

function EditLinkModal({
  link,
  onClose,
  onSaved,
}: {
  link: ManagerLink
  onClose: () => void
  onSaved: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [permissions, setPermissions] = useState<string[]>(link.permissions ?? [])

  function togglePerm(permission: string) {
    setPermissions((current) => current.includes(permission) ? current.filter((value) => value !== permission) : [...current, permission])
  }

  async function handleSavePermissions() {
    setSaving(true)
    try {
      await adminApi.updateCelebrityManager(link.celebrity_id, link.id, { permissions, is_active: link.is_active })
      onClose()
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-brand-purple/10 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-content-primary">Edit Manager Permissions</h2>
            <p className="mt-1 text-sm text-content-muted">
              {link.manager?.name} for {link.celebrity?.name}
            </p>
          </div>
          <button onClick={onClose} className="text-content-muted hover:text-content-primary">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-content-muted">Permissions</p>
          <div className="flex flex-wrap gap-2">
            {MANAGER_PERMISSIONS.map((permission) => (
              <PermissionToggle key={permission} perm={permission} selected={permissions.includes(permission)} onChange={() => togglePerm(permission)} />
            ))}
          </div>
          {link.notes && <p className="mt-4 text-sm text-content-muted">Notes: {link.notes}</p>}
        </div>

        <div className="flex gap-3 border-t border-brand-purple/10 px-6 py-4">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-brand-purple/20 text-sm font-semibold text-content-secondary hover:bg-surface-subtle transition-colors">
            Cancel
          </button>
          <button onClick={handleSavePermissions} disabled={saving} className="flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60" style={{ background: 'linear-gradient(135deg,#9a78fe,#422266)' }}>
            {saving ? <Spinner size="sm" /> : <Shield className="w-4 h-4" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

function LinkRow({ link, onUpdated, canManage }: { link: ManagerLink; onUpdated: () => void; canManage: boolean }) {
  const [saving, setSaving] = useState(false)
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [actionsOpen, setActionsOpen] = useState(false)
  const canPortal = typeof document !== 'undefined'

  useEffect(() => {
    function handleOutsideClick() {
      setActionsOpen(false)
    }

    if (actionsOpen) {
      document.addEventListener('click', handleOutsideClick)
    }

    return () => {
      document.removeEventListener('click', handleOutsideClick)
    }
  }, [actionsOpen])

  async function handleRemove() {
    setSaving(true)
    try {
      await adminApi.removeCelebrityManager(link.celebrity_id, link.id)
      setConfirmRemoveOpen(false)
      onUpdated()
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <tr className="border-b border-brand-purple/6 align-top last:border-b-0">
        <td className="px-4 py-3 text-sm font-medium text-content-primary">{link.celebrity?.name || '—'}</td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap gap-2">
            {link.permissions.length > 0 ? (
              link.permissions.map((permission) => (
                <span key={permission} className="inline-flex rounded-full bg-brand-purple/10 px-2.5 py-1 text-[11px] font-semibold text-brand-purple">
                  {permission.replace(/_/g, ' ')}
                </span>
              ))
            ) : (
              <span className="text-xs text-content-muted">No permissions</span>
            )}
          </div>
        </td>
        <td className="px-4 py-3">
          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${link.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
            {link.is_active ? 'Active' : 'Inactive'}
          </span>
        </td>
        <td className="px-4 py-3 text-center">
          {canManage ? (
            <div className="relative mx-auto w-fit">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  setActionsOpen((current) => !current)
                }}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-brand-purple/20 text-content-secondary transition-colors hover:border-brand-purple/40 hover:text-brand-purple hover:bg-brand-purple/5"
                aria-label="Open link actions"
              >
                {saving ? <Spinner size="sm" className="text-brand-purple" /> : <MoreHorizontal className="h-4 w-4" />}
              </button>

              {actionsOpen && !saving && (
                <div
                  className="absolute right-0 top-11 z-20 min-w-[170px] overflow-hidden rounded-xl border border-brand-purple/10 bg-white shadow-lg"
                  onClick={(event) => event.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setShowEdit(true)
                      setActionsOpen(false)
                    }}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-content-primary transition-colors hover:bg-surface-subtle"
                  >
                    <Pencil className="h-4 w-4 text-brand-purple" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setActionsOpen(false)
                      setSaving(true)
                      try {
                        await adminApi.updateCelebrityManager(link.celebrity_id, link.id, { is_active: !link.is_active, permissions: link.permissions })
                        onUpdated()
                      } finally {
                        setSaving(false)
                      }
                    }}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-content-primary transition-colors hover:bg-surface-subtle"
                  >
                    {link.is_active ? <Link2Off className="h-4 w-4 text-amber-600" /> : <Link2 className="h-4 w-4 text-emerald-600" />}
                    {link.is_active ? 'Deactivate' : 'Reactivate'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmRemoveOpen(true)
                      setActionsOpen(false)
                    }}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                  >
                    <X className="h-4 w-4" />
                    Remove
                  </button>
                </div>
              )}
            </div>
          ) : (
            <span className="text-xs text-content-muted">No actions</span>
          )}
        </td>
      </tr>

      {canPortal && createPortal(
        <>
          <ConfirmActionModal
            open={confirmRemoveOpen}
            title="Remove manager link"
            message={`Remove ${link.manager?.name || 'this manager'} from ${link.celebrity?.name || 'this celebrity'}?`}
            confirmLabel="Remove"
            tone="danger"
            loading={saving}
            onClose={() => setConfirmRemoveOpen(false)}
            onConfirm={handleRemove}
          />
          {showEdit && (
            <EditLinkModal
              link={link}
              onClose={() => setShowEdit(false)}
              onSaved={onUpdated}
            />
          )}
        </>,
        document.body
      )}
    </>
  )
}

export default function CelebrityManagersPage() {
  const [managers, setManagers] = useState<ManagerOption[]>([])
  const [celebrities, setCelebrities] = useState<CelebrityOption[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [addCelebId, setAddCelebId] = useState<string | undefined>(undefined)
  const [addManagerId, setAddManagerId] = useState<string | undefined>(undefined)
  const [expandedManagerId, setExpandedManagerId] = useState<string | null>(null)
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null)

  const permissions = usePermissions()
  const canManage = permissions.includes('celebrity_managers.manage')
  const debouncedSearch = useDebounce(search, 300)

  const fetchManagers = useCallback(() => {
    setLoading(true)
    Promise.all([
      adminApi.managers(),
      adminApi.celebrities('limit=200'),
    ])
      .then(([managerRes, celebRes]: any[]) => {
        setManagers(managerRes.data || [])
        setCelebrities((celebRes.data || []).map((item: any) => ({
          id: item.id,
          name: item.name,
          thumbnail_url: item.thumbnail_url,
        })))
      })
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchManagers() }, [fetchManagers])

  useEffect(() => {
    function handleOutsideClick() {
      setActiveActionMenuId(null)
    }

    if (activeActionMenuId) {
      document.addEventListener('click', handleOutsideClick)
    }

    return () => {
      document.removeEventListener('click', handleOutsideClick)
    }
  }, [activeActionMenuId])

  const filteredManagers = managers.filter((manager) => {
    const term = debouncedSearch.trim().toLowerCase()
    if (!term) return true
    const linkedNames = (manager.celebrity_links || []).map((link) => link.celebrity.name.toLowerCase()).join(' ')
    return [
      manager.name,
      manager.email,
      manager.phone,
      manager.agency_name,
      linkedNames,
    ].some((value) => String(value || '').toLowerCase().includes(term))
  })

  return (
    <div className="p-8">
      {showAdd && (
        <AddLinkModal
          managers={managers}
          celebrities={celebrities}
          initialCelebId={addCelebId}
          initialManagerId={addManagerId}
          onSaved={() => { setShowAdd(false); setAddCelebId(undefined); setAddManagerId(undefined); fetchManagers() }}
          onCancel={() => { setShowAdd(false); setAddCelebId(undefined); setAddManagerId(undefined) }}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-purple/10 flex items-center justify-center">
            <Link2 className="w-5 h-5 text-brand-purple" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-content-primary">Celebrity Managers</h1>
            <p className="text-sm text-content-muted mt-0.5">{managers.length} managers across the platform</p>
          </div>
        </div>
        {canManage && (
          <button onClick={() => { setAddCelebId(undefined); setAddManagerId(undefined); setShowAdd(true) }} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold" style={{ background: 'linear-gradient(135deg,#9a78fe,#422266)' }}>
            <Plus className="w-4 h-4" />
            Add New Manager
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

      {!loading && filteredManagers.length === 0 && (
        <div className="bg-white rounded-2xl border border-brand-purple/12 p-8 text-center">
          <p className="text-sm text-content-muted">No managers found</p>
        </div>
      )}

      {!loading && filteredManagers.length > 0 && (
        <div className="overflow-visible rounded-2xl border border-brand-purple/12 bg-white shadow-card">
          <table className="w-full">
            <thead>
              <tr className="border-b border-brand-purple/8">
                {['Manager', 'Contact', 'Agency', 'Actions'].map((header) => (
                  <th
                    key={header}
                    className={`px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-content-muted ${header === 'Actions' ? 'text-center' : 'text-left'}`}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-purple/6">
              {filteredManagers.map((manager) => {
                const expanded = expandedManagerId === manager.id
                const linkedCount = manager.celebrity_links?.length || 0
                return (
                  <Fragment key={manager.id}>
                    <tr key={manager.id} className="hover:bg-surface-subtle/30 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-purple/10 text-sm font-bold text-brand-purple">
                            {manager.name?.charAt(0) || 'M'}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-content-primary">{manager.name}</p>
                            <p className="text-xs text-content-muted">{manager.is_active ? 'Active manager' : 'Inactive manager'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm text-content-primary">{manager.email}</p>
                        <p className="mt-1 text-xs text-content-muted">{manager.phone || 'No phone'}</p>
                      </td>
                      <td className="px-5 py-4 text-sm text-content-secondary">{manager.agency_name || '—'}</td>
                      <td className="px-5 py-4 text-center">
                        <div className="relative mx-auto w-fit">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              setActiveActionMenuId((current) => current === manager.id ? null : manager.id)
                            }}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-brand-purple/20 text-content-secondary transition-colors hover:border-brand-purple/40 hover:text-brand-purple hover:bg-brand-purple/5"
                            aria-label="Open manager actions"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>

                          {activeActionMenuId === manager.id && (
                            <div
                              className="absolute bottom-11 right-0 z-30 min-w-[170px] overflow-hidden rounded-xl border border-brand-purple/10 bg-white shadow-lg"
                              onClick={(event) => event.stopPropagation()}
                            >
                              {canManage && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAddManagerId(manager.id)
                                    setAddCelebId(undefined)
                                    setShowAdd(true)
                                    setActiveActionMenuId(null)
                                  }}
                                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-content-primary transition-colors hover:bg-surface-subtle"
                                >
                                  <Plus className="h-4 w-4 text-brand-purple" />
                                  Add Celebrity
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setExpandedManagerId(expanded ? null : manager.id)
                                  setActiveActionMenuId(null)
                                }}
                                className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-content-primary transition-colors hover:bg-surface-subtle"
                              >
                                <Eye className="h-4 w-4 text-brand-purple" />
                                {expanded ? 'Close' : `Open (${linkedCount})`}
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expanded && (
                      <tr key={`${manager.id}-expanded`} className="bg-surface-subtle/20">
                        <td colSpan={4} className="px-5 py-4">
                          {(manager.celebrity_links || []).length === 0 ? (
                            <p className="text-sm text-content-muted">This manager has no celebrity links yet.</p>
                          ) : (
                            <div className="overflow-visible rounded-2xl border border-brand-purple/10 bg-white">
                              <table className="w-full">
                                <thead>
                                  <tr className="border-b border-brand-purple/8 bg-surface-subtle/40">
                                    {['Assigned Celebrity', 'Permissions', 'Status', 'Actions'].map((header) => (
                                      <th key={header} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-content-muted">
                                        {header}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {manager.celebrity_links!.map((link) => (
                                    <LinkRow
                                      key={link.id}
                                      link={{
                                        id: link.id,
                                        celebrity_id: link.celebrity.id,
                                        permissions: link.permissions,
                                        is_active: link.is_active,
                                        notes: link.notes,
                                        celebrity: {
                                          id: link.celebrity.id,
                                          name: link.celebrity.name,
                                        },
                                        manager: {
                                          id: manager.id,
                                          name: manager.name,
                                          email: manager.email,
                                          phone: manager.phone,
                                          agency_name: manager.agency_name,
                                        },
                                      }}
                                      onUpdated={fetchManagers}
                                      canManage={canManage}
                                    />
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
