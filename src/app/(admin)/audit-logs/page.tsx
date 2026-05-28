'use client'
import { useEffect, useState, useCallback } from 'react'
import { Search, ShieldCheck } from 'lucide-react'
import { adminApi } from '@/lib/api'
import { PageLoader } from '@/components/ui/Spinner'
import { useDebounce } from '@/lib/hooks'

const ACTION_COLORS: Record<string, string> = {
  blocked:                     'bg-red-100 text-red-700',
  active:                      'bg-emerald-100 text-emerald-700',
  manager_linked:              'bg-blue-100 text-blue-700',
  manager_unlinked:            'bg-amber-100 text-amber-700',
  manager_removed:             'bg-red-100 text-red-700',
  manager_permissions_updated: 'bg-brand-purple/10 text-brand-purple',
}

function actionLabel(action: string) {
  return action.replace('.', ' · ').replace(/_/g, ' ')
}

function actionBadgeClass(action: string) {
  const key = action.split('.')[1] ?? action
  return ACTION_COLORS[key] ?? 'bg-surface-subtle text-content-muted'
}

const fmt = (d: string) =>
  d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

export default function AuditLogsPage() {
  const [logs, setLogs]             = useState<any[]>([])
  const [total, setTotal]           = useState(0)
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [targetType, setTargetType] = useState('all')
  const [page, setPage]             = useState(1)
  const limit = 30

  const debouncedSearch = useDebounce(search, 300)

  const fetchLogs = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (debouncedSearch) params.set('action', debouncedSearch)
    if (targetType !== 'all') params.set('targetType', targetType)
    adminApi.auditLogs(params.toString())
      .then((res: any) => { setLogs(res.logs || []); setTotal(res.total || 0) })
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [debouncedSearch, targetType, page])

  useEffect(() => { setPage(1) }, [debouncedSearch, targetType])
  useEffect(() => { fetchLogs() }, [fetchLogs])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-brand-purple/10 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-brand-purple" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-content-primary">Audit Logs</h1>
          <p className="text-sm text-content-muted mt-0.5">{total} events recorded</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative">
          <Search className="w-4 h-4 text-content-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Filter by action..."
            className="pl-9 pr-4 py-2 rounded-xl border border-brand-purple/20 text-sm outline-none focus:border-brand-purple bg-white text-content-primary placeholder:text-content-muted w-56 transition-colors" />
        </div>
        <div className="flex gap-1.5">
          {['all', 'user', 'celebrity', 'admin'].map(t => (
            <button key={t} onClick={() => setTargetType(t)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold capitalize transition-all ${
                targetType === t ? 'text-white' : 'bg-white border border-brand-purple/20 text-content-secondary hover:border-brand-purple/40 hover:text-brand-purple'
              }`}
              style={targetType === t ? { background: 'linear-gradient(135deg,#9a78fe,#422266)' } : {}}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-brand-purple/12 shadow-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-brand-purple/8">
              {['Actor', 'Action', 'Target', 'Reason', 'Timestamp'].map(h => (
                <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-content-muted uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-purple/6">
            {loading && <tr><td colSpan={5} className="px-5 py-12"><PageLoader /></td></tr>}
            {!loading && logs.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-content-muted">No audit events found</td></tr>
            )}
            {logs.map((log: any) => (
              <tr key={log.id} className="hover:bg-surface-subtle/40 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-brand-purple/10 flex items-center justify-center text-xs font-bold text-brand-purple shrink-0">
                      {log.actor_name?.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-content-primary">{log.actor_name}</p>
                      <p className="text-xs text-content-muted capitalize">{log.actor_role}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${actionBadgeClass(log.action)}`}>
                    {actionLabel(log.action)}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <p className="text-sm font-semibold text-content-primary">{log.target_name ?? log.target_id}</p>
                  <p className="text-xs text-content-muted capitalize">{log.target_type}</p>
                </td>
                <td className="px-5 py-3.5">
                  <p className="text-sm text-content-secondary max-w-[200px] truncate" title={log.reason}>{log.reason || '—'}</p>
                </td>
                <td className="px-5 py-3.5 text-xs text-content-muted whitespace-nowrap">{fmt(log.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
