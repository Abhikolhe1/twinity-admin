'use client'
import { useEffect, useState, useCallback } from 'react'
import { Search, UserCheck, UserX, Mail, KeyRound } from 'lucide-react'
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

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<Set<string>>(new Set())

  const permissions = usePermissions()
  const canManage = permissions.includes('users.manage')

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

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  async function toggleStatus(id: string, current: string) {
    if (toggling.has(id)) return
    const newStatus = current === 'blocked' ? 'active' : 'blocked'
    setToggling(prev => new Set(prev).add(id))
    try {
      await adminApi.updateUser(id, { status: newStatus })
      setUsers(prev => prev.map(u => u.id === id ? { ...u, status: newStatus } : u))
    } catch {}
    setToggling(prev => { const s = new Set(prev); s.delete(id); return s })
  }

  return (
    <div className="p-8">
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
              {['Customer', 'Email', 'Auth', 'Status', 'Verified', 'Last Login', 'Joined', ...(canManage ? ['Actions'] : [])].map(h => (
                <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-content-muted uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-purple/6">
            {loading && (
              <tr>
                <td colSpan={canManage ? 8 : 7} className="px-5 py-12">
                  <PageLoader />
                </td>
              </tr>
            )}
            {!loading && users.length === 0 && (
              <tr><td colSpan={canManage ? 8 : 7} className="px-5 py-8 text-center text-sm text-content-muted">No customers found</td></tr>
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
                      <span className="text-sm font-semibold text-content-primary">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5 text-sm text-content-secondary">
                      <Mail className="w-3.5 h-3.5 text-content-muted" />{user.email}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <AuthBadge provider={user.auth_provider} />
                  </td>
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
                  {canManage && (
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => toggleStatus(user.id, user.status)}
                        disabled={busy}
                        className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                          user.status === 'blocked'
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-red-50 text-red-600 hover:bg-red-100'
                        }`}>
                        {busy
                          ? <Spinner size="sm" />
                          : user.status === 'blocked'
                            ? <UserCheck className="w-3.5 h-3.5" />
                            : <UserX className="w-3.5 h-3.5" />
                        }
                        {user.status === 'blocked' ? 'Unblock' : 'Block'}
                      </button>
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
