'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AlertTriangle, Clock3, RefreshCw, Save, ShieldCheck, Users2 } from 'lucide-react'
import {
  adminApi,
  type ManagerDashboardCelebrityTemplates,
  type ManagerDashboardOverview,
  type ManagerDashboardRequest,
  type ManagerDashboardTemplate,
} from '@/lib/api'
import { usePermissions } from '@/lib/permissions-context'

type AuditLog = {
  id: string
  actor_name: string
  actor_role: string
  action: string
  target_name?: string | null
  target_id: string
  created_at: string
  reason?: string | null
}

type RequestFilter = 'all' | 'pending' | 'review' | 'breached'

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

export default function ManagerDashboardPage() {
  const pathname = usePathname()
  const permissions = usePermissions()
  const [overview, setOverview] = useState<ManagerDashboardOverview | null>(null)
  const [requests, setRequests] = useState<ManagerDashboardRequest[]>([])
  const [templatesByCelebrity, setTemplatesByCelebrity] = useState<ManagerDashboardCelebrityTemplates[]>([])
  const [allTemplates, setAllTemplates] = useState<ManagerDashboardTemplate[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<RequestFilter>('all')
  const [savingCelebrityId, setSavingCelebrityId] = useState<string | null>(null)
  const [actingRequestId, setActingRequestId] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function load() {
    setError('')
    const [overviewRes, requestsRes, templatesRes, auditRes] = await Promise.all([
      adminApi.managerDashboardOverview(),
      adminApi.managerDashboardRequests('limit=8'),
      adminApi.managerDashboardTemplates(),
      adminApi.managerDashboardAuditLogs('limit=8'),
    ])

    setOverview({
      summary: overviewRes.summary,
      portfolio: overviewRes.portfolio,
      alerts: overviewRes.alerts,
    })
    setRequests(requestsRes.data || [])
    setTemplatesByCelebrity(templatesRes.data || [])
    setAllTemplates(templatesRes.templates || [])
    setAuditLogs((auditRes.logs || []) as AuditLog[])
  }

  useEffect(() => {
    load()
      .catch((err: Error) => setError(err.message || 'Failed to load manager dashboard'))
      .finally(() => setLoading(false))
  }, [])

  async function refresh() {
    setRefreshing(true)
    try {
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh dashboard')
    } finally {
      setRefreshing(false)
    }
  }

  async function saveTemplates(celebrityId: string, templateIds: string[]) {
    setSavingCelebrityId(celebrityId)
    setError('')
    try {
      await adminApi.updateManagerDashboardTemplates(celebrityId, templateIds)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update template pre-approvals')
    } finally {
      setSavingCelebrityId(null)
    }
  }

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
    if (filter === 'all') return requests
    if (filter === 'pending') return requests.filter((request) => request.status === 'pending' || request.status === 'in_progress')
    if (filter === 'review') return requests.filter((request) => request.status === 'review')
    if (filter === 'breached') return requests.filter((request) => request.slaState === 'breached')
    return requests
  }, [filter, requests])

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-purple">TWIN-59 MVP</p>
          <h1 className="mt-2 text-2xl font-bold text-content-primary">Manager Dashboard</h1>
          <p className="mt-1 text-sm text-content-muted">
            Multi-celebrity portfolio, incoming request queue, SLA monitoring, template controls, and manager audit visibility.
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-brand-purple/20 bg-white px-4 py-2.5 text-sm font-medium text-content-secondary transition-all hover:bg-surface-subtle disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh dashboard'}
        </button>
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

      {loading ? (
        <div className="rounded-3xl border border-brand-purple/12 bg-white p-10 text-center text-sm text-content-muted shadow-card">
          Loading manager workspace...
        </div>
      ) : !overview || overview.summary.totalCelebrities === 0 ? (
        <div className="rounded-3xl border border-brand-purple/12 bg-white p-10 text-center text-sm text-content-muted shadow-card">
          No active celebrity links are assigned to this manager account yet.
        </div>
      ) : (
        <div className="space-y-6">
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Linked celebrities" value={overview.summary.totalCelebrities} icon={<Users2 className="h-4 w-4" />} />
            <MetricCard label="Live requests" value={overview.summary.totalRequests} icon={<Clock3 className="h-4 w-4" />} />
            <MetricCard label="Awaiting review" value={overview.summary.reviewRequests} icon={<ShieldCheck className="h-4 w-4" />} />
            <MetricCard label="SLA breaches" value={overview.summary.breachedRequests} icon={<AlertTriangle className="h-4 w-4" />} tone="danger" />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
            <Card title="Celebrity Portfolio Overview" description="All celebrities currently assigned to this manager account.">
              <div className="grid gap-4 md:grid-cols-2">
                {overview.portfolio.map((celebrity) => (
                  <div key={celebrity.id} className="rounded-2xl border border-brand-purple/10 bg-surface-subtle/30 p-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={celebrity.name} imageUrl={celebrity.thumbnail_url || undefined} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-content-primary">{celebrity.name}</p>
                        <p className="text-xs text-content-muted">{celebrity.industry} | SLA {celebrity.slaHours}h</p>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                      <MiniStat label="Pending" value={celebrity.pendingCount} />
                      <MiniStat label="Review" value={celebrity.reviewCount} />
                      <MiniStat label="Delivered" value={celebrity.deliveredCount} />
                      <MiniStat label="Breached" value={celebrity.breachedCount} tone={celebrity.breachedCount > 0 ? 'danger' : 'default'} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="SLA Tracker & Breach Alerts" description="Requests that need manager attention first.">
              <div className="space-y-3">
                {overview.alerts.length === 0 ? (
                  <p className="text-sm text-content-muted">No due-soon or breached requests right now.</p>
                ) : (
                  overview.alerts.map((alert) => (
                    <div key={alert.referenceId} className={`rounded-2xl border px-4 py-3 ${alert.slaState === 'breached' ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-content-primary">{alert.referenceId}</p>
                          <p className="mt-1 text-xs text-content-muted">{alert.celebrityName} | {alert.purpose}</p>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${alert.slaState === 'breached' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                          {alert.slaState === 'breached' ? 'Breached' : 'Due soon'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
            <Card title="Incoming Request Queue" description="Recent requests across all linked celebrities.">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {([
                    ['all', 'All'],
                    ['pending', 'Pending'],
                    ['review', 'Review'],
                    ['breached', 'Breached'],
                  ] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFilter(value)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${filter === value ? 'bg-brand-purple text-white' : 'border border-brand-purple/20 bg-white text-content-secondary'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <Link href="/manager/requests" className="text-sm font-semibold text-brand-purple hover:underline">
                  View full queue
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="border-b border-brand-purple/8 text-left text-xs font-bold uppercase tracking-[0.14em] text-content-muted">
                      <th className="px-3 py-3">Request</th>
                      <th className="px-3 py-3">Celebrity</th>
                      <th className="px-3 py-3">Customer</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-3 py-3">SLA</th>
                      <th className="px-3 py-3">Value</th>
                      <th className="px-3 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-6 text-center text-sm text-content-muted">No requests match this filter.</td>
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
            </Card>

            <Card title="Manager Audit Log" description="Recent actions across your linked celebrities and manager activity.">
              <div className="space-y-3">
                {auditLogs.length === 0 ? (
                  <p className="text-sm text-content-muted">No manager audit events recorded yet.</p>
                ) : (
                  auditLogs.map((log) => (
                    <div key={log.id} className="rounded-2xl border border-brand-purple/10 bg-surface-subtle/30 px-4 py-3">
                      <p className="text-sm font-semibold text-content-primary">{log.actor_name}</p>
                      <p className="mt-1 text-xs text-content-muted">
                        {log.action.replace('.', ' | ').replace(/_/g, ' ')} | {log.target_name || log.target_id}
                      </p>
                      <p className="mt-1 text-[11px] text-content-muted">{new Date(log.created_at).toLocaleString()}</p>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </section>

          <Card title="Template Pre-Approval Management" description="Adjust commercial template fast-track selections for each linked celebrity.">
            <div className="grid gap-5 xl:grid-cols-2">
              {templatesByCelebrity.map((celebrity) => (
                <TemplateManagerCard
                  key={celebrity.id}
                  celebrity={celebrity}
                  templates={allTemplates}
                  saving={savingCelebrityId === celebrity.id}
                  onSave={saveTemplates}
                />
              ))}
            </div>
          </Card>
        </div>
      )}
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

function Card({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-brand-purple/12 bg-white p-6 shadow-card">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-purple">{title}</p>
      <p className="mt-2 text-sm text-content-muted">{description}</p>
      <div className="mt-5">{children}</div>
    </section>
  )
}

function MetricCard({ label, value, icon, tone = 'default' }: { label: string; value: number; icon: ReactNode; tone?: 'default' | 'danger' }) {
  return (
    <div className="rounded-3xl border border-brand-purple/12 bg-white p-5 shadow-card">
      <div className="flex items-center justify-between">
        <span className={`inline-flex rounded-xl p-2 ${tone === 'danger' ? 'bg-red-50 text-red-600' : 'bg-brand-purple/10 text-brand-purple'}`}>
          {icon}
        </span>
      </div>
      <p className="mt-4 text-3xl font-bold text-content-primary">{value}</p>
      <p className="mt-1 text-sm text-content-muted">{label}</p>
    </div>
  )
}

function Avatar({ name, imageUrl }: { name: string; imageUrl?: string }) {
  if (imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={imageUrl} alt="" className="h-12 w-12 rounded-2xl object-cover" />
  }
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-purple/10 text-sm font-bold text-brand-purple">
      {name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
    </div>
  )
}

function MiniStat({ label, value, tone = 'default' }: { label: string; value: number; tone?: 'default' | 'danger' }) {
  return (
    <div className={`rounded-2xl px-3 py-2 ${tone === 'danger' ? 'bg-red-50 text-red-600' : 'bg-white text-content-secondary'}`}>
      <p className="text-[11px] uppercase tracking-[0.12em]">{label}</p>
      <p className="mt-1 text-base font-semibold">{value}</p>
    </div>
  )
}

function TemplateManagerCard({
  celebrity,
  templates,
  saving,
  onSave,
}: {
  celebrity: ManagerDashboardCelebrityTemplates
  templates: ManagerDashboardTemplate[]
  saving: boolean
  onSave: (celebrityId: string, templateIds: string[]) => Promise<void>
}) {
  const [selected, setSelected] = useState<string[]>(celebrity.preapproved_template_ids)

  useEffect(() => {
    setSelected(celebrity.preapproved_template_ids)
  }, [celebrity.preapproved_template_ids])

  function toggle(templateId: string) {
    setSelected((current) => (
      current.includes(templateId)
        ? current.filter((value) => value !== templateId)
        : [...current, templateId]
    ))
  }

  return (
    <div className="rounded-3xl border border-brand-purple/10 bg-surface-subtle/30 p-5">
      <div className="flex items-center gap-3">
        <Avatar name={celebrity.name} imageUrl={celebrity.thumbnail_url || undefined} />
        <div>
          <p className="text-sm font-semibold text-content-primary">{celebrity.name}</p>
          <p className="text-xs text-content-muted">SLA {celebrity.slaHours}h | {selected.length} pre-approved</p>
        </div>
      </div>
      <div className="mt-4 grid gap-2">
        {templates.map((template) => {
          const active = selected.includes(template.id)
          return (
            <label key={template.id} className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${active ? 'border-brand-purple bg-brand-purple/6' : 'border-brand-purple/12 bg-white'}`}>
              <input
                type="checkbox"
                checked={active}
                onChange={() => toggle(template.id)}
                className="h-4 w-4 rounded border-brand-purple/30"
              />
              <div>
                <p className="text-sm font-semibold text-content-primary">{template.name}</p>
                <p className="text-xs text-content-muted">{template.purpose} | {template.duration}</p>
              </div>
            </label>
          )
        })}
      </div>
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={() => onSave(celebrity.id, selected)}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-purple px-4 py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save templates'}
        </button>
      </div>
    </div>
  )
}

function slaTone(state: ManagerDashboardRequest['slaState']) {
  if (state === 'breached') return 'bg-red-100 text-red-700'
  if (state === 'due_soon') return 'bg-amber-100 text-amber-700'
  if (state === 'completed') return 'bg-emerald-100 text-emerald-700'
  return 'bg-brand-purple/10 text-brand-purple'
}
