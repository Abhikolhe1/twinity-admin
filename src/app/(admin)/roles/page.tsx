'use client'
import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, ShieldCheck, X, ChevronRight, LayoutDashboard, Users, Star, Film, PhoneCall, Settings, Users2, Save, FileText } from 'lucide-react'
import { adminApi } from '@/lib/api'
import { usePermissions } from '@/lib/permissions-context'

// ── Permission definitions ────────────────────────────────────────────────────

const PERMISSION_SECTIONS = [
  { key: 'dashboard',   label: 'Dashboard',    icon: LayoutDashboard, actions: ['view'] },
  { key: 'users',       label: 'Users',         icon: Users,           actions: ['view', 'manage'] },
  { key: 'celebrities', label: 'Celebrities',   icon: Star,            actions: ['view', 'manage'] },
  { key: 'videos',      label: 'Video Jobs',    icon: Film,            actions: ['view', 'manage'] },
  { key: 'leads',       label: 'Leads / CRM',   icon: PhoneCall,       actions: ['view', 'manage'] },
  { key: 'templates',   label: 'Templates',     icon: FileText,        actions: ['view', 'manage'] },
  { key: 'settings',    label: 'Settings',      icon: Settings,        actions: ['view', 'manage'] },
  { key: 'team',        label: 'Team',          icon: Users2,          actions: ['view', 'manage'] },
  { key: 'roles',       label: 'Roles',         icon: ShieldCheck,     actions: ['view', 'manage'] },
] as const

// ── Types ─────────────────────────────────────────────────────────────────────

interface Role {
  id: string
  name: string
  description: string
  permissions: string[]
  is_system: boolean
  memberCount: number
  created_at: string
}

const EMPTY_FORM = { name: '', description: '', permissions: [] as string[] }

// ── Helpers ───────────────────────────────────────────────────────────────────

function permKey(section: string, action: string) {
  return `${section}.${action}`
}

function hasPermission(permissions: string[], key: string) {
  return permissions.includes(key)
}

function togglePermission(permissions: string[], key: string, sectionKey: string): string[] {
  const adding = !permissions.includes(key)
  let next = adding ? [...permissions, key] : permissions.filter(p => p !== key)

  // manage implies view — enforce both ways
  if (key.endsWith('.manage')) {
    const viewKey = `${sectionKey}.view`
    if (adding && !next.includes(viewKey)) next = [...next, viewKey]
  }
  if (key.endsWith('.view') && !adding) {
    const manageKey = `${sectionKey}.manage`
    next = next.filter(p => p !== manageKey)
  }
  return next
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<Role | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const permissions = usePermissions()
  const canManage = permissions.includes('roles.manage')

  useEffect(() => { fetchRoles() }, [])

  async function fetchRoles() {
    setLoading(true)
    try {
      const res = await adminApi.roles() as any
      setRoles(res.data || [])
    } catch {
      setRoles([])
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setError('')
    setDrawerOpen(true)
  }

  function openEdit(role: Role) {
    setEditing(role)
    setForm({ name: role.name, description: role.description, permissions: [...role.permissions] })
    setError('')
    setDrawerOpen(true)
  }

  function closeDrawer() {
    setDrawerOpen(false)
    setEditing(null)
    setError('')
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (editing) {
        await adminApi.updateRole(editing.id, { name: form.name, description: form.description, permissions: form.permissions })
      } else {
        await adminApi.createRole({ name: form.name, description: form.description, permissions: form.permissions })
      }
      closeDrawer()
      fetchRoles()
    } catch (err: any) {
      setError(err.message || 'Failed to save role')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    try {
      await adminApi.deleteRole(deleteId)
      setDeleteId(null)
      fetchRoles()
    } catch (err: any) {
      setError(err.message || 'Failed to delete role')
      setDeleteId(null)
    } finally {
      setDeleting(false)
    }
  }

  const permissionCount = (perms: string[]) => perms.length

  return (
    <div className="p-4 sm:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-bold text-content-primary">Roles</h1>
          <p className="text-sm text-content-muted mt-1">Define roles and assign granular permissions for your team</p>
        </div>
        {canManage && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg,#9a78fe,#422266)' }}
          >
            <Plus className="w-4 h-4" />
            New Role
          </button>
        )}
      </div>

      {/* Roles list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-white rounded-2xl border border-brand-purple/12 animate-pulse" />
          ))}
        </div>
      ) : roles.length === 0 ? (
        <div className="bg-white rounded-2xl border border-brand-purple/12 shadow-card flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 bg-surface-subtle">
            <ShieldCheck className="w-6 h-6 text-content-muted" />
          </div>
          <p className="text-sm font-semibold text-content-secondary">No roles yet</p>
          <p className="text-xs text-content-muted mt-1">Create your first role to start assigning permissions</p>
          {canManage && (
            <button onClick={openCreate} className="mt-5 text-sm font-semibold text-brand-purple hover:underline">
              Create a role
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-brand-purple/12 shadow-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-purple/8 bg-surface-subtle/50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-content-muted uppercase tracking-wide">Role</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-content-muted uppercase tracking-wide hidden sm:table-cell">Permissions</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-content-muted uppercase tracking-wide hidden md:table-cell">Members</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-purple/6">
              {roles.map(role => (
                <tr key={role.id} className="hover:bg-surface-subtle/40 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: 'linear-gradient(135deg,#9a78fe22,#42226622)' }}
                      >
                        <ShieldCheck className="w-4 h-4 text-brand-purple" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-content-primary">{role.name}</p>
                          {role.is_system && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-surface-elevated text-content-muted">
                              SYSTEM
                            </span>
                          )}
                        </div>
                        {role.description && (
                          <p className="text-xs text-content-muted mt-0.5">{role.description}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 hidden sm:table-cell">
                    <div className="flex flex-wrap gap-1.5 max-w-xs">
                      {permissionCount(role.permissions) === 0 ? (
                        <span className="text-xs text-content-muted italic">No permissions</span>
                      ) : (
                        <>
                          {role.permissions.slice(0, 4).map(p => (
                            <span key={p} className="text-[11px] px-2 py-0.5 rounded-full bg-surface-subtle border border-brand-purple/12 text-content-secondary">
                              {p}
                            </span>
                          ))}
                          {role.permissions.length > 4 && (
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-brand-purple/10 text-brand-purple font-semibold">
                              +{role.permissions.length - 4} more
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <span className="text-sm text-content-secondary">{role.memberCount ?? 0}</span>
                  </td>
                  {canManage && (
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => openEdit(role)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-content-muted hover:text-brand-purple hover:bg-surface-subtle transition-all"
                          title="Edit role"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {!role.is_system && (
                          <button
                            onClick={() => setDeleteId(role.id)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-content-muted hover:text-red-500 hover:bg-red-50 transition-all"
                            title="Delete role"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/30" onClick={closeDrawer} />
          <div className="relative ml-auto w-full max-w-lg bg-white h-full flex flex-col shadow-2xl">
            {/* Drawer header */}
            <div className="px-6 py-4 border-b border-brand-purple/8 flex items-center justify-between shrink-0">
              <div>
                <h2 className="font-bold text-content-primary">{editing ? 'Edit Role' : 'New Role'}</h2>
                <p className="text-xs text-content-muted mt-0.5">
                  {editing ? 'Update permissions for this role' : 'Define a role and assign permissions'}
                </p>
              </div>
              <button onClick={closeDrawer} className="w-8 h-8 rounded-xl flex items-center justify-center text-content-muted hover:bg-surface-subtle transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer body */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto flex flex-col">
              <div className="px-6 py-5 flex flex-col gap-4">
                {error && (
                  <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-content-primary mb-1.5">Role Name</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Content Manager"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-brand-purple/20 text-sm outline-none focus:border-brand-purple focus:shadow-[0_0_0_3px_rgba(154,120,254,0.10)] bg-white text-content-primary placeholder:text-content-muted transition-all"
                    disabled={editing?.is_system}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-content-primary mb-1.5">Description</label>
                  <textarea
                    rows={2}
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Brief description of this role's responsibilities"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-brand-purple/20 text-sm outline-none focus:border-brand-purple focus:shadow-[0_0_0_3px_rgba(154,120,254,0.10)] bg-white text-content-primary placeholder:text-content-muted transition-all resize-none"
                  />
                </div>

                {/* Permission grid */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-content-primary">Permissions</p>
                    <div className="flex gap-1 text-xs text-content-muted">
                      <span className="inline-block w-14 text-center">View</span>
                      <span className="inline-block w-14 text-center">Manage</span>
                    </div>
                  </div>

                  <div className="border border-brand-purple/12 rounded-xl overflow-hidden">
                    {PERMISSION_SECTIONS.map((section, i) => {
                      const Icon = section.icon
                      return (
                        <div
                          key={section.key}
                          className={[
                            'flex items-center justify-between px-4 py-3',
                            i < PERMISSION_SECTIONS.length - 1 ? 'border-b border-brand-purple/8' : '',
                          ].join(' ')}
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon className="w-3.5 h-3.5 text-content-muted shrink-0" />
                            <span className="text-sm text-content-secondary">{section.label}</span>
                          </div>
                          <div className="flex gap-1">
                            {(['view', 'manage'] as const).map(action => {
                              const hasAction = section.actions.includes(action as any)
                              const key = permKey(section.key, action)
                              const checked = hasPermission(form.permissions, key)
                              return (
                                <div key={action} className="w-14 flex items-center justify-center">
                                  {hasAction ? (
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() =>
                                        setForm(f => ({
                                          ...f,
                                          permissions: togglePermission(f.permissions, key, section.key),
                                        }))
                                      }
                                      disabled={editing?.is_system}
                                      className="w-4 h-4 accent-brand-purple cursor-pointer"
                                    />
                                  ) : (
                                    <span className="text-content-muted/30 text-lg select-none">—</span>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <p className="text-xs text-content-muted mt-2">
                    Manage includes view. Unchecking view also removes manage.
                  </p>
                </div>
              </div>

              {/* Drawer footer */}
              <div className="px-6 py-4 border-t border-brand-purple/8 flex items-center justify-end gap-3 shrink-0 bg-surface-subtle/40">
                <button type="button" onClick={closeDrawer} className="px-4 py-2 rounded-xl text-sm font-medium text-content-secondary hover:bg-surface-subtle transition-all">
                  Cancel
                </button>
                {!editing?.is_system && (
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg,#9a78fe,#422266)' }}
                  >
                    <Save className="w-3.5 h-3.5" />
                    {saving ? 'Saving...' : editing ? 'Update Role' : 'Create Role'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/30" onClick={() => setDeleteId(null)} />
          <div className="relative bg-white rounded-2xl border border-brand-purple/12 shadow-2xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-content-primary mb-2">Delete role?</h3>
            <p className="text-sm text-content-muted mb-5">
              This will permanently remove the role. Any team members assigned to it will lose their permissions.
            </p>
            {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 rounded-xl text-sm font-medium text-content-secondary hover:bg-surface-subtle transition-all">
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-all disabled:opacity-60"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
