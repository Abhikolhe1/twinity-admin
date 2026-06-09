'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Plus, RefreshCw } from 'lucide-react'
import { adminApi, type ManagerDashboardOverview } from '@/lib/api'

export default function ManagerCelebritiesPage() {
  const [overview, setOverview] = useState<ManagerDashboardOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setError('')
    const res = await adminApi.managerDashboardOverview()
    setOverview({
      summary: res.summary,
      portfolio: res.portfolio,
      alerts: res.alerts,
    })
  }

  useEffect(() => {
    load()
      .catch((err: Error) => setError(err.message || 'Failed to load celebrities'))
      .finally(() => setLoading(false))
  }, [])

  async function refresh() {
    setRefreshing(true)
    try {
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh celebrities')
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-purple">Manager Workspace</p>
          <h1 className="mt-2 text-2xl font-bold text-content-primary">Celebrities</h1>
          <p className="mt-1 text-sm text-content-muted">
            View every celebrity assigned to you and add new ones from the same workspace.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={refresh}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-brand-purple/20 bg-white px-4 py-2.5 text-sm font-medium text-content-secondary transition-all hover:bg-surface-subtle disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <Link
            href="/manager/celebrities/new"
            className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg,#9a78fe,#422266)' }}
          >
            <Plus className="h-4 w-4" />
            Add Celebrity
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-3xl border border-brand-purple/12 bg-white p-10 text-center text-sm text-content-muted shadow-card">
          Loading celebrities...
        </div>
      ) : !overview || overview.portfolio.length === 0 ? (
        <div className="rounded-3xl border border-brand-purple/12 bg-white p-10 text-center shadow-card">
          <p className="text-sm text-content-muted">No celebrities are assigned to this manager account yet.</p>
          <Link
            href="/manager/celebrities/new"
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg,#9a78fe,#422266)' }}
          >
            <Plus className="h-4 w-4" />
            Add First Celebrity
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-brand-purple/12 bg-white shadow-card">
          <table className="min-w-full">
            <thead className="border-b border-brand-purple/10 bg-surface-subtle/30">
              <tr className="text-left text-xs font-bold uppercase tracking-[0.16em] text-content-muted">
                <th className="px-6 py-4">Celebrity</th>
                <th className="px-6 py-4">Industry</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Orders</th>
                <th className="px-6 py-4">Pending</th>
                <th className="px-6 py-4">Review</th>
                <th className="px-6 py-4">Delivered</th>
                <th className="px-6 py-4">SLA</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {overview.portfolio.map((celebrity) => (
                <tr key={celebrity.id} className="border-b border-brand-purple/8 last:border-b-0">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {celebrity.thumbnail_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={celebrity.thumbnail_url} alt="" className="h-12 w-12 rounded-2xl object-cover" />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-purple/10 text-sm font-bold text-brand-purple">
                          {celebrity.name.split(' ').map((part) => part[0] || '').join('').slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-content-primary">{celebrity.name}</p>
                        <p className="truncate text-xs text-content-muted">{celebrity.onboarding_status}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-content-secondary">{celebrity.industry || 'Profile in progress'}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${celebrity.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {celebrity.is_active ? 'Active' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-content-primary">{celebrity.total_orders}</td>
                  <td className="px-6 py-4 text-sm text-content-secondary">{celebrity.pendingCount}</td>
                  <td className="px-6 py-4 text-sm text-content-secondary">{celebrity.reviewCount}</td>
                  <td className="px-6 py-4 text-sm text-content-secondary">{celebrity.deliveredCount}</td>
                  <td className="px-6 py-4 text-sm text-content-secondary">{celebrity.slaHours}h</td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/manager/celebrities/${celebrity.id}`}
                      className="inline-flex items-center justify-center rounded-xl border border-brand-purple/20 px-3 py-2 text-sm font-medium text-brand-purple transition-all hover:bg-surface-subtle"
                    >
                      Open Profile
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
