'use client'
import { useEffect, useState, useCallback } from 'react'
import { Search, UserCheck, UserX, Mail, KeyRound, ClipboardList, X } from 'lucide-react'
import { adminApi } from '@/lib/api'
import Spinner, { PageLoader } from '@/components/ui/Spinner'
import { useDebounce } from '@/lib/hooks'
import { usePermissions } from '@/lib/permissions-context'

const STATUS_COLORS: Record<string, string> = {
  active:  'bg-emerald-100 text-emerald-700',
  blocked: 'bg-red-100 text-red-700',
  pending: 'bg-amber-100 text-amber-700',
}

const fmt = (d: string) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

function AuthBadge({ provider }: { provider?: string }) {
  if (provider === 'google') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-50 border border-gray-200 text-xs font-semibold text-gray-600">
        <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden>
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Google
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-purple/8 border border-brand-purple/15 text-xs font-semibold text-brand-purple">
      <KeyRound className="w-3 h-3" />
      Email
    </span>
  )
}

interface SuspendModalProps {
  user: any
  onConfirm: (reason: string) => void
  onCancel: () => void
  loading: boolean
}

function SuspendModal({ user, onConfirm, onCancel, loading }: SuspendModalProps) {
  const [reason, setReason] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-content-primary">Block Customer</h2>
            <p className="text-sm text-content-muted mt-0.5">Block <strong>{user.name}</strong> from accessing Twinity</p>
          </div>
          <button onClick={onCancel} className="text-content-muted hover:text-content-primary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="mb-5">
          <label className="block text-sm font-semibold text-content-primary mb-1.5">Reason <span className="text-content-muted font-normal">(optional)</span></label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={3}
            placeholder="e.g. Violation of terms of service..."
            className="w-full rounded-xl border border-brand-purple/20 px-3 py-2.5 text-sm text-content-primary placeholder:text-content-muted outline-none focus:border-brand-purple resize-none"
          />
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2.5 rounded-xl border border-brand-purple/20 text-sm font-semibold text-content-secondary hover:bg-surface-subtle transition-colors">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
            {loading ? <Spinner size="sm" /> : <UserX className="w-4 h-4" />}
            Block Account
          </button>
        </div>
      </div>
    </div>
  )
}

interface AuditModalProps {
  user: any
  onClose: () => void
}

function AuditModal({ user, onClose }: AuditModalProps) {
  const [logs, setLogs]     = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.getUserAuditLogs(user.id)
      .then((res: any) => setLogs(res.logs || []))
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [user.id])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-brand-purple/10">
          <div>
            <h2 className="text-lg font-bold text-content-primary">Activity Log</h2>
            <p className="text-sm text-content-muted mt-0.5">{user.name}</p>
          </div>
          <button onClick={onClose} className="text-content-muted hover:text-content-primary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-4">
          {loading && <PageLoader />}
          {!loading && logs.length === 0 && (
            <p className="text-center text-sm text-content-muted py-8">No activity recorded yet.</p>
          )}
          {logs.map((log: any) => (
            <div key={log.id} className="flex gap-3 py-3 border-b border-brand-purple/6 last:border-0">
              <div className="w-8 h-8 rounded-full bg-brand-purple/10 flex items-center justify-center text-xs font-bold text-brand-purple shrink-0">
                {log.actor_name?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-content-primary">
                  <strong>{log.actor_name}</strong>
                  <span className="text-content-muted"> · {log.action.replace('.', ' ')}</span>
                </p>
                {log.reason && <p className="text-xs text-content-muted mt-0.5">Reason: {log.reason}</p>}
                <p className="text-xs text-content-muted mt-0.5">{new Date(log.created_at).toLocaleString()}</p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-surface-subtle text-content-muted capitalize self-start shrink-0">
                {log.action.split('.')[1]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function UsersPage() {
  const [users, setUsers]             = useState<any[]>([])
  const [total, setTotal]             = useState(0)
  const [search, setSearch]           = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading]         = useState(true)
  const [toggling, setToggling]       = useState<Set<string>>(new Set())
  const [suspendTarget, setSuspendTarget] = useState<any | null>(null)
  const [suspending, setSuspending]   = useState(false)
  const [auditTarget, setAuditTarget] = useState<any | null>(null)

  const permissions = usePermissions()
  const canManage   = permissions.includes('users.manage')
  const canAudit    = permissions.includes('audit_logs.view')

  const debouncedSearch = useDebounce(search, 300)

  const fetchUsers = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (debouncedSearch) params.set('search', debouncedSearch)
    adminApi.users(params.toString())
      .then((res: any) => {
        setUsers(res.data || [])
        setTotal(res.total || 0)
      })
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [statusFilter, debouncedSearch])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  async function handleSetStatus(id: string, status: 'active' | 'blocked') {
    if (toggling.has(id)) return
    setToggling(prev => new Set(prev).add(id))
    try {
      await adminApi.updateUser(id, { status })
      setUsers(prev => prev.map(u => u.id === id ? { ...u, status, suspension_reason: null, suspended_at: null } : u))
    } catch {}
    setToggling(prev => { const s = new Set(prev); s.delete(id); return s })
  }

  async function handleConfirmBlock(reason: string) {
    if (!suspendTarget) return
    setSuspending(true)
    try {
      await adminApi.updateUser(suspendTarget.id, { status: 'blocked', reason })
      setUsers(prev => prev.map(u => u.id === suspendTarget.id ? { ...u, status: 'blocked', suspension_reason: reason, suspended_at: new Date().toISOString() } : u))
      setSuspendTarget(null)
    } catch {}
    setSuspending(false)
  }

  const colCount = 7 + (canManage ? 1 : 0) + (canAudit ? 1 : 0)

  return (
    <div className="p-8">
      {suspendTarget && (
        <SuspendModal
          user={suspendTarget}
          onConfirm={handleConfirmBlock}
          onCancel={() => setSuspendTarget(null)}
          loading={suspending}
        />
      )}
      {auditTarget && (
        <AuditModal user={auditTarget} onClose={() => setAuditTarget(null)} />
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-content-primary">Customers</h1>
        <p className="text-sm text-content-muted mt-1">{total} registered customers</p>
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative">
          <Search className="w-4 h-4 text-content-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name or email..."
            className="pl-9 pr-4 py-2 rounded-xl border border-brand-purple/20 text-sm outline-none focus:border-brand-purple bg-white text-content-primary placeholder:text-content-muted w-64 transition-colors" />
        </div>
        <div className="flex gap-1.5">
          {['all', 'active', 'blocked', 'pending'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold capitalize transition-all ${
                statusFilter === s
                  ? 'text-white'
                  : 'bg-white border border-brand-purple/20 text-content-secondary hover:border-brand-purple/40 hover:text-brand-purple'
              }`}
              style={statusFilter === s ? { background: 'linear-gradient(135deg,#9a78fe,#422266)' } : {}}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-brand-purple/12 shadow-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-brand-purple/8">
              {['Customer', 'Email', 'Auth', 'Status', 'Verified', 'Last Login', 'Joined',
                ...(canAudit  ? ['Activity'] : []),
                ...(canManage ? ['Actions']  : []),
              ].map(h => (
                <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-content-muted uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-purple/6">
            {loading && (
              <tr><td colSpan={colCount} className="px-5 py-12"><PageLoader /></td></tr>
            )}
            {!loading && users.length === 0 && (
              <tr><td colSpan={colCount} className="px-5 py-8 text-center text-sm text-content-muted">No customers found</td></tr>
            )}
            {users.map(user => {
              const busy = toggling.has(user.id)
              return (
                <tr key={user.id} className="hover:bg-surface-subtle/40 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-surface-subtle flex items-center justify-center text-xs font-bold text-brand-purple">
                        {user.name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-content-primary">{user.name}</span>
                        {user.suspension_reason && (
                          <p className="text-xs text-red-500 mt-0.5 max-w-[180px] truncate" title={user.suspension_reason}>
                            {user.suspension_reason}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5 text-sm text-content-secondary">
                      <Mail className="w-3.5 h-3.5 text-content-muted" />{user.email}
                    </div>
                  </td>
                  <td className="px-5 py-3.5"><AuthBadge provider={user.auth_provider} /></td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[user.status] || 'bg-surface-subtle text-content-muted'}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${user.is_email_verified ? 'bg-emerald-50 text-emerald-600' : 'bg-surface-subtle text-content-muted'}`}>
                      {user.is_email_verified ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-content-muted">{fmt(user.last_login_at)}</td>
                  <td className="px-5 py-3.5 text-xs text-content-muted">{fmt(user.created_at)}</td>
                  {canAudit && (
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => setAuditTarget(user)}
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-brand-purple/8 text-brand-purple hover:bg-brand-purple/15 transition-all">
                        <ClipboardList className="w-3.5 h-3.5" />
                        Logs
                      </button>
                    </td>
                  )}
                  {canManage && (
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        {user.status === 'pending' && (
                          <button
                            onClick={() => handleSetStatus(user.id, 'active')}
                            disabled={busy}
                            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-all disabled:opacity-60 disabled:cursor-not-allowed">
                            {busy ? <Spinner size="sm" /> : <UserCheck className="w-3.5 h-3.5" />}
                            Activate
                          </button>
                        )}
                        {user.status !== 'pending' && (
                          <button
                            onClick={() => user.status === 'blocked' ? handleSetStatus(user.id, 'active') : setSuspendTarget(user)}
                            disabled={busy}
                            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                              user.status === 'blocked'
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                : 'bg-red-50 text-red-600 hover:bg-red-100'
                            }`}>
                            {busy ? <Spinner size="sm" /> : user.status === 'blocked' ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                            {user.status === 'blocked' ? 'Unblock' : 'Block'}
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
