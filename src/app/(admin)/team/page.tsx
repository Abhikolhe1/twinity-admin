'use client'
import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Users2, X, Save, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react'
import { adminApi } from '@/lib/api'
import { usePermissions } from '@/lib/permissions-context'

// ── Types ─────────────────────────────────────────────────────────────────────

interface RoleOption {
  id: string
  name: string
}

interface TeamMember {
  id: string
  name: string
  email: string
  role_id?: string
  assigned_role?: RoleOption
  is_active: boolean
  last_login_at?: string
  created_at: string
}

const EMPTY_FORM = {
  name: '',
  email: '',
  password: '',
  roleId: '',
  isActive: true,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

function formatDate(iso?: string) {
  if (!iso) return 'Never'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [roles, setRoles] = useState<RoleOption[]>([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<TeamMember | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [showPw, setShowPw] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const permissions = usePermissions()
  const canManage = permissions.includes('team.manage')

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [membersRes, rolesRes] = await Promise.allSettled([
      adminApi.team() as Promise<any>,
      adminApi.roles() as Promise<any>,
    ])
    setMembers(membersRes.status === 'fulfilled' ? membersRes.value.data || [] : [])
    setRoles(rolesRes.status === 'fulfilled' ? rolesRes.value.data || [] : [])
    setLoading(false)
  }

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setError('')
    setShowPw(false)
    setDrawerOpen(true)
  }

  function openEdit(member: TeamMember) {
    setEditing(member)
    setForm({
      name: member.name,
      email: member.email,
      password: '',
      roleId: member.role_id ?? '',
      isActive: member.is_active,
    })
    setError('')
    setShowPw(false)
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
      const payload: Record<string, unknown> = {
        name: form.name,
        roleId: form.roleId || undefined,
        isActive: form.isActive,
      }
      if (!editing) {
        payload.email = form.email
        payload.password = form.password
      } else if (form.password) {
        payload.password = form.password
      }

      if (editing) {
        await adminApi.updateMember(editing.id, payload)
      } else {
        await adminApi.createMember({ ...payload, email: form.email, password: form.password })
      }
      closeDrawer()
      fetchAll()
    } catch (err: any) {
      setError(err.message || 'Failed to save team member')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    try {
      await adminApi.deleteMember(deleteId)
      setDeleteId(null)
      fetchAll()
    } catch (err: any) {
      setError(err.message || 'Failed to remove team member')
      setDeleteId(null)
    } finally {
      setDeleting(false)
    }
  }

  async function toggleActive(member: TeamMember) {
    try {
      await adminApi.updateMember(member.id, { isActive: !member.is_active })
      fetchAll()
    } catch { /* silent */ }
  }

  return (
    <div className="p-4 sm:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-bold text-content-primary">Team</h1>
          <p className="text-sm text-content-muted mt-1">Manage internal users and their role assignments</p>
        </div>
        {canManage && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg,#9a78fe,#422266)' }}
          >
            <Plus className="w-4 h-4" />
            Add Member
          </button>
        )}
      </div>

      {/* Members table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-white rounded-2xl border border-brand-purple/12 animate-pulse" />
          ))}
        </div>
      ) : members.length === 0 ? (
        <div className="bg-white rounded-2xl border border-brand-purple/12 shadow-card flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 bg-surface-subtle">
            <Users2 className="w-6 h-6 text-content-muted" />
          </div>
          <p className="text-sm font-semibold text-content-secondary">No team members yet</p>
          <p className="text-xs text-content-muted mt-1">Add internal users and assign roles to grant access</p>
          {canManage && (
            <button onClick={openCreate} className="mt-5 text-sm font-semibold text-brand-purple hover:underline">
              Add first member
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-brand-purple/12 shadow-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-purple/8 bg-surface-subtle/50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-content-muted uppercase tracking-wide">Member</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-content-muted uppercase tracking-wide hidden sm:table-cell">Role</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-content-muted uppercase tracking-wide hidden md:table-cell">Last Login</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-content-muted uppercase tracking-wide hidden lg:table-cell">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-purple/6">
              {members.map(member => (
                <tr key={member.id} className="hover:bg-surface-subtle/40 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 text-white"
                        style={{ background: 'linear-gradient(135deg,#9a78fe,#422266)' }}
                      >
                        {initials(member.name)}
                      </div>
                      <div>
                        <p className="font-semibold text-content-primary">{member.name}</p>
                        <p className="text-xs text-content-muted">{member.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 hidden sm:table-cell">
                    {member.assigned_role ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-surface-subtle border border-brand-purple/12 text-brand-purple">
                        {member.assigned_role.name}
                      </span>
                    ) : (
                      <span className="text-xs text-content-muted italic">No role</span>
                    )}
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell text-xs text-content-muted">
                    {formatDate(member.last_login_at)}
                  </td>
                  <td className="px-5 py-4 hidden lg:table-cell">
                    {canManage ? (
                      <button
                        onClick={() => toggleActive(member)}
                        className={[
                          'inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border transition-all',
                          member.is_active
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100'
                            : 'bg-surface-subtle border-brand-purple/12 text-content-muted hover:bg-surface-elevated',
                        ].join(' ')}
                      >
                        {member.is_active
                          ? <><CheckCircle className="w-3 h-3" /> Active</>
                          : <><XCircle className="w-3 h-3" /> Inactive</>
                        }
                      </button>
                    ) : (
                      <span className={[
                        'inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border',
                        member.is_active
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                          : 'bg-surface-subtle border-brand-purple/12 text-content-muted',
                      ].join(' ')}>
                        {member.is_active
                          ? <><CheckCircle className="w-3 h-3" /> Active</>
                          : <><XCircle className="w-3 h-3" /> Inactive</>
                        }
                      </span>
                    )}
                  </td>
                  {canManage && (
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => openEdit(member)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-content-muted hover:text-brand-purple hover:bg-surface-subtle transition-all"
                          title="Edit member"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteId(member.id)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-content-muted hover:text-red-500 hover:bg-red-50 transition-all"
                          title="Remove member"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
          <div className="relative ml-auto w-full max-w-md bg-white h-full flex flex-col shadow-2xl">
            {/* Drawer header */}
            <div className="px-6 py-4 border-b border-brand-purple/8 flex items-center justify-between shrink-0">
              <div>
                <h2 className="font-bold text-content-primary">{editing ? 'Edit Member' : 'Add Member'}</h2>
                <p className="text-xs text-content-muted mt-0.5">
                  {editing ? 'Update details and role assignment' : 'Create a new internal user account'}
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

                {/* Name */}
                <div>
                  <label className="block text-sm font-semibold text-content-primary mb-1.5">Full Name</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Ahmed Al-Rashid"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-brand-purple/20 text-sm outline-none focus:border-brand-purple focus:shadow-[0_0_0_3px_rgba(154,120,254,0.10)] bg-white text-content-primary placeholder:text-content-muted transition-all"
                  />
                </div>

                {/* Email — readonly on edit */}
                <div>
                  <label className="block text-sm font-semibold text-content-primary mb-1.5">Email Address</label>
                  <input
                    type="email"
                    required={!editing}
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="user@twinity.ai"
                    readOnly={!!editing}
                    className={[
                      'w-full px-3.5 py-2.5 rounded-xl border border-brand-purple/20 text-sm outline-none transition-all',
                      'focus:border-brand-purple focus:shadow-[0_0_0_3px_rgba(154,120,254,0.10)] bg-white text-content-primary placeholder:text-content-muted',
                      editing ? 'opacity-60 cursor-not-allowed' : '',
                    ].join(' ')}
                  />
                  {editing && <p className="text-xs text-content-muted mt-1">Email cannot be changed after creation.</p>}
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-semibold text-content-primary mb-1.5">
                    {editing ? 'New Password' : 'Password'}
                    {editing && <span className="text-content-muted font-normal ml-1">(leave blank to keep current)</span>}
                  </label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      required={!editing}
                      value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      placeholder="Min. 8 characters"
                      minLength={editing && !form.password ? undefined : 8}
                      className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-brand-purple/20 text-sm outline-none focus:border-brand-purple focus:shadow-[0_0_0_3px_rgba(154,120,254,0.10)] bg-white text-content-primary placeholder:text-content-muted transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-content-muted hover:text-content-secondary transition-colors"
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Role */}
                <div>
                  <label className="block text-sm font-semibold text-content-primary mb-1.5">Assigned Role</label>
                  <select
                    value={form.roleId}
                    onChange={e => setForm(f => ({ ...f, roleId: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-brand-purple/20 text-sm outline-none focus:border-brand-purple bg-white text-content-primary transition-all"
                  >
                    <option value="">— No role assigned —</option>
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-content-muted mt-1">Roles control which sections this user can access.</p>
                </div>

                {/* Status toggle (edit only) */}
                {editing && (
                  <div className="flex items-center justify-between p-4 rounded-xl border border-brand-purple/12 bg-surface-subtle/40">
                    <div>
                      <p className="text-sm font-semibold text-content-primary">Account Active</p>
                      <p className="text-xs text-content-muted mt-0.5">Inactive members cannot log in</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                      className={[
                        'relative w-11 h-6 rounded-full transition-all duration-200 shrink-0',
                        form.isActive ? 'bg-brand-purple' : 'bg-gray-200',
                      ].join(' ')}
                    >
                      <span
                        className={[
                          'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200',
                          form.isActive ? 'translate-x-5' : 'translate-x-0',
                        ].join(' ')}
                      />
                    </button>
                  </div>
                )}
              </div>

              {/* Drawer footer */}
              <div className="px-6 py-4 border-t border-brand-purple/8 flex items-center justify-end gap-3 shrink-0 bg-surface-subtle/40 mt-auto">
                <button type="button" onClick={closeDrawer} className="px-4 py-2 rounded-xl text-sm font-medium text-content-secondary hover:bg-surface-subtle transition-all">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg,#9a78fe,#422266)' }}
                >
                  <Save className="w-3.5 h-3.5" />
                  {saving ? 'Saving...' : editing ? 'Update Member' : 'Add Member'}
                </button>
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
            <h3 className="font-bold text-content-primary mb-2">Remove team member?</h3>
            <p className="text-sm text-content-muted mb-5">
              This will permanently remove their admin access. This action cannot be undone.
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
                {deleting ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
