'use client'
import { useCallback, useEffect, useState } from 'react'
import { Search, AlertTriangle } from 'lucide-react'
import { adminApi } from '@/lib/api'
import { PageLoader } from '@/components/ui/Spinner'

const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-amber-100 text-amber-700',
  approved:  'bg-emerald-100 text-emerald-700',
  rejected:  'bg-red-100 text-red-700',
  escalated: 'bg-orange-100 text-orange-700',
}

const TYPE_COLORS: Record<string, string> = {
  minor:     'bg-blue-100 text-blue-700',
  material:  'bg-red-100 text-red-700',
  escalation:'bg-orange-100 text-orange-700',
}

const STATUSES = ['', 'pending', 'approved', 'rejected', 'escalated']

const fmt = (d: string) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

interface Revision {
  id: string
  attempt_number: number
  type: string
  reason: string
  classification?: string
  status: string
  submitted_by_user_id: string
  created_at: string
  video_job: {
    reference_id: string
    product_type: string
    status: string
    user: { name: string; email: string }
    celebrity: { name: string }
  }
}

export default function RevisionsPage() {
  const [revisions, setRevisions] = useState<Revision[]>([])
  const [total, setTotal]         = useState(0)
  const [page, setPage]           = useState(1)
  const [pages, setPages]         = useState(1)
  const [status, setStatus]       = useState('')
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    params.set('page', String(page))
    params.set('limit', '20')
    adminApi.revisions(params.toString())
      .then((res: any) => {
        setRevisions(res.revisions ?? [])
        setTotal(res.total ?? 0)
        setPages(res.pages ?? 1)
      })
      .catch((err: Error) => setError(err.message || 'Failed to load revisions'))
      .finally(() => setLoading(false))
  }, [status, page])

  useEffect(() => { load() }, [load])

  function handleStatusChange(s: string) {
    setStatus(s)
    setPage(1)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-content-primary">Revision Queue</h1>
          <p className="text-sm text-content-muted mt-0.5">
            All client revision requests across platform ({total} total)
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        {STATUSES.map((s) => (
          <button
            key={s || 'all'}
            type="button"
            onClick={() => handleStatusChange(s)}
            className={`h-8 px-3 rounded-lg text-xs font-semibold border transition-colors ${
              status === s
                ? 'bg-brand-purple text-white border-brand-purple'
                : 'bg-surface border-border text-content-muted hover:text-content-primary'
            }`}
          >
            {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertTriangle size={14} />
          {error}
        </div>
      )}

      {loading ? (
        <PageLoader />
      ) : revisions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-content-muted gap-2">
          <Search size={32} className="opacity-40" />
          <p className="text-sm">No revisions found</p>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-content-muted text-xs font-semibold uppercase tracking-wide">
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Request</th>
                <th className="px-4 py-3 text-left">Celebrity</th>
                <th className="px-4 py-3 text-left">Client</th>
                <th className="px-4 py-3 text-left">Attempt</th>
                <th className="px-4 py-3 text-left">Classification</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {revisions.map((rev) => (
                <tr key={rev.id} className="hover:bg-surface-elevated transition-colors">
                  <td className="px-4 py-3 text-content-muted font-mono text-xs">
                    {rev.video_job.reference_id}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-content-muted capitalize">
                      {rev.video_job.product_type.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-content-primary font-medium">
                    {rev.video_job.celebrity?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-content-primary">{rev.video_job.user?.name ?? '—'}</p>
                    <p className="text-content-muted text-xs">{rev.video_job.user?.email ?? ''}</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand-purple/10 text-brand-purple font-bold text-xs">
                      {rev.attempt_number}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${TYPE_COLORS[rev.classification ?? rev.type] ?? ''}`}>
                      {(rev.classification ?? rev.type).charAt(0).toUpperCase() + (rev.classification ?? rev.type).slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${STATUS_COLORS[rev.status] ?? ''}`}>
                      {rev.status.charAt(0).toUpperCase() + rev.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-content-muted text-xs whitespace-nowrap">
                    {fmt(rev.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm text-content-muted">
              <span>Page {page} of {pages} · {total} revisions</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="h-8 px-3 rounded-lg border border-border text-xs disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= pages}
                  onClick={() => setPage(p => p + 1)}
                  className="h-8 px-3 rounded-lg border border-border text-xs disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
