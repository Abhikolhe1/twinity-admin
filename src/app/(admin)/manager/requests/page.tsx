'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Search } from 'lucide-react'
import { adminApi, type ManagerDashboardOverview, type ManagerDashboardRequest } from '@/lib/api'
import { usePermissions } from '@/lib/permissions-context'

type StatusFilter = 'all' | 'pending' | 'review' | 'breached' | 'delivered' | 'failed'

function promptRejectReason(): string | null {
  const input = window.prompt('Add rejection reason')
  if (input === null) return null
  const reason = input.trim()
  if (!reason) {
    window.alert('Reject reason is required')
    return null
  }
  return reason
}

export default function ManagerRequestsPage() {
  const pathname = usePathname()
  const permissions = usePermissions()
  const [requests, setRequests] = useState<ManagerDashboardRequest[]>([])
  const [overview, setOverview] = useState<ManagerDashboardOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actingRequestId, setActingRequestId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [celebrityId, setCelebrityId] = useState('all')
  const [status, setStatus] = useState<StatusFilter>('all')

  async function load() {
    setError('')
    const params = new URLSearchParams({ limit: '100' })
    if (celebrityId !== 'all') params.set('celebrityId', celebrityId)
    if (search.trim()) params.set('search', search.trim())
    const normalizedStatus = status === 'breached' ? 'all' : status
    if (normalizedStatus !== 'all') params.set('status', normalizedStatus === 'pending' ? 'pending' : normalizedStatus)
    if (status === 'breached') params.set('slaState', 'breached')

    const [overviewRes, requestsRes] = await Promise.all([
      adminApi.managerDashboardOverview(),
      adminApi.managerDashboardRequests(params.toString()),
    ])

    setOverview({
      summary: overviewRes.summary,
      portfolio: overviewRes.portfolio,
      alerts: overviewRes.alerts,
    })
    setRequests(requestsRes.data || [])
  }

  useEffect(() => {
    load()
      .catch((err: Error) => setError(err.message || 'Failed to load request queue'))
      .finally(() => setLoading(false))
  }, [celebrityId, search, status])

  async function approveRequest(jobId: string) {
    setActingRequestId(jobId)
    setError('')
    try {
      await adminApi.managerApproveJob(jobId)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve request')
    } finally {
      setActingRequestId(null)
    }
  }

  async function rejectRequest(jobId: string) {
    const note = promptRejectReason()
    if (note === null) return
    setActingRequestId(jobId)
    setError('')
    try {
      await adminApi.managerRejectJob(jobId, note)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject request')
    } finally {
      setActingRequestId(null)
    }
  }

  const filteredRequests = useMemo(() => {
    if (status === 'pending') {
      return requests.filter((request) => request.status === 'pending' || request.status === 'in_progress')
    }
    return requests
  }, [requests, status])

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-purple">TWIN-59 Requests</p>
        <h1 className="mt-2 text-2xl font-bold text-content-primary">Incoming Request Queue</h1>
        <p className="mt-1 text-sm text-content-muted">
          Review every request across all linked celebrities with search and targeted filters.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <ManagerTab href="/manager/dashboard" label="Overview" active={pathname === '/manager/dashboard'} />
        <ManagerTab href="/manager/requests" label="All Requests" active={pathname === '/manager/requests'} />
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <section className="rounded-3xl border border-brand-purple/12 bg-white p-6 shadow-card">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr_0.8fr]">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-content-primary">Search client or request</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-muted" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Client name, email, company, request ref..."
                className="w-full rounded-xl border border-brand-purple/20 bg-white py-2.5 pl-10 pr-4 text-sm text-content-primary outline-none transition-all placeholder:text-content-muted focus:border-brand-purple"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-content-primary">Celebrity</label>
            <select
              value={celebrityId}
              onChange={(event) => setCelebrityId(event.target.value)}
              className="w-full rounded-xl border border-brand-purple/20 bg-white px-3 py-2.5 text-sm text-content-primary outline-none focus:border-brand-purple"
            >
              <option value="all">All celebrities</option>
              {overview?.portfolio.map((celebrity) => (
                <option key={celebrity.id} value={celebrity.id}>{celebrity.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-content-primary">Status</label>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as StatusFilter)}
              className="w-full rounded-xl border border-brand-purple/20 bg-white px-3 py-2.5 text-sm text-content-primary outline-none focus:border-brand-purple"
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="review">Review</option>
              <option value="breached">Breached</option>
              <option value="delivered">Delivered</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead>
              <tr className="border-b border-brand-purple/8 text-left text-xs font-bold uppercase tracking-[0.14em] text-content-muted">
                <th className="px-3 py-3">Request</th>
                <th className="px-3 py-3">Celebrity</th>
                <th className="px-3 py-3">Client</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">SLA</th>
                <th className="px-3 py-3">Value</th>
                <th className="px-3 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-sm text-content-muted">Loading request queue...</td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-sm text-content-muted">No requests found for these filters.</td>
                </tr>
              ) : (
                filteredRequests.map((request) => (
                  <tr key={request.id} className="border-b border-brand-purple/6 align-top last:border-b-0">
                    <td className="px-3 py-3">
                      <p className="text-sm font-semibold text-content-primary">{request.reference_id}</p>
                      <p className="mt-1 text-xs text-content-muted">{request.product_type.replace(/[-_]/g, ' ')} | {request.purpose}</p>
                    </td>
                    <td className="px-3 py-3 text-sm text-content-secondary">{request.celebrity?.name || '-'}</td>
                    <td className="px-3 py-3">
                      <p className="text-sm text-content-primary">{request.user?.name || 'Unknown'}</p>
                      <p className="mt-1 text-xs text-content-muted">{request.user?.company || request.user?.email || '-'}</p>
                    </td>
                    <td className="px-3 py-3">
                      <span className="inline-flex rounded-full bg-surface-subtle px-3 py-1 text-xs font-semibold capitalize text-content-secondary">
                        {request.status.replace(/[-_]/g, ' ')}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${slaTone(request.slaState)}`}>
                        {request.slaState.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm font-semibold text-content-primary">
                      {request.currency} {request.estimated_price.toLocaleString()}
                    </td>
                    <td className="px-3 py-3">
                      {request.status === 'review' ? (
                        <div className="flex flex-wrap gap-2">
                          {permissions.includes('approve_requests') && (
                            <button
                              type="button"
                              onClick={() => approveRequest(request.id)}
                              disabled={actingRequestId === request.id}
                              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                            >
                              {actingRequestId === request.id ? 'Saving...' : 'Approve'}
                            </button>
                          )}
                          {permissions.includes('reject_requests') && (
                            <button
                              type="button"
                              onClick={() => rejectRequest(request.id)}
                              disabled={actingRequestId === request.id}
                              className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-60"
                            >
                              Reject
                            </button>
                          )}
                          {!permissions.includes('approve_requests') && !permissions.includes('reject_requests') && (
                            <span className="text-xs text-content-muted">No action access</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-content-muted">No action</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function ManagerTab({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
        active ? 'bg-brand-purple text-white' : 'border border-brand-purple/20 bg-white text-content-secondary hover:bg-surface-subtle'
      }`}
    >
      {label}
    </Link>
  )
}

function slaTone(state: ManagerDashboardRequest['slaState']) {
  if (state === 'breached') return 'bg-red-100 text-red-700'
  if (state === 'due_soon') return 'bg-amber-100 text-amber-700'
  if (state === 'completed') return 'bg-emerald-100 text-emerald-700'
  return 'bg-brand-purple/10 text-brand-purple'
}
