'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ClipboardCheck, RefreshCw, ShieldAlert, Wallet } from 'lucide-react'
import { adminApi, type AdminReportingDashboard } from '@/lib/api'
import { PageLoader } from '@/components/ui/Spinner'

function formatMoney(value: number) {
  return `SAR ${Math.round(value).toLocaleString()}`
}

function productTypeLabel(value: string) {
  if (value === 'video_ad') return 'Video Ad'
  if (value === 'image_ad') return 'Image Ad'
  return 'Greeting'
}

function StatCard({ label, value, sub, tone = 'default' }: { label: string; value: string | number; sub?: string; tone?: 'default' | 'danger' | 'success' | 'warning' }) {
  const toneClass = tone === 'danger'
    ? 'border-red-200 bg-red-50'
    : tone === 'success'
      ? 'border-emerald-200 bg-emerald-50'
      : tone === 'warning'
        ? 'border-amber-200 bg-amber-50'
        : 'border-brand-purple/12 bg-white'

  return (
    <div className={`rounded-2xl border p-4 shadow-card ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-content-muted">{label}</p>
      <p className="mt-3 text-2xl font-bold text-content-primary">{value}</p>
      {sub ? <p className="mt-1 text-xs text-content-muted">{sub}</p> : null}
    </div>
  )
}

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-brand-purple/12 bg-white p-6 shadow-card">
      <div className="mb-5">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-purple">{title}</p>
        <p className="mt-2 text-sm text-content-muted">{description}</p>
      </div>
      {children}
    </section>
  )
}

export default function ReportingPage() {
  const [data, setData] = useState<AdminReportingDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const query = useMemo(() => {
    const params = new URLSearchParams()
    if (startDate) params.set('from', new Date(`${startDate}T00:00:00`).toISOString())
    if (endDate) params.set('to', new Date(`${endDate}T23:59:59.999`).toISOString())
    return params.toString()
  }, [startDate, endDate])

  const load = useCallback(async (activeQuery: string) => {
    setError('')
    const res = await adminApi.reportingDashboard(activeQuery)
    setData(res.data)
  }, [])

  useEffect(() => {
    load(query)
      .catch((err: Error) => setError(err.message || 'Failed to load reporting dashboard'))
      .finally(() => setLoading(false))
  }, [load, query])

  async function refresh() {
    setRefreshing(true)
    try {
      await load(query)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh reporting dashboard')
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-content-primary">Reporting & KPIs</h1>
          <p className="mt-1 text-sm text-content-muted">
            Executive and operational reporting across requests, approvals, revisions, refunds, and compliance.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-content-muted">
            Start Date
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 block rounded-xl border border-brand-purple/18 bg-white px-3 py-2 text-sm text-content-primary outline-none transition focus:border-brand-purple"
            />
          </label>
          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-content-muted">
            End Date
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 block rounded-xl border border-brand-purple/18 bg-white px-3 py-2 text-sm text-content-primary outline-none transition focus:border-brand-purple"
            />
          </label>
          <button
            type="button"
            onClick={refresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-purple px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {error ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-3xl border border-brand-purple/12 bg-white p-10 shadow-card">
          <PageLoader />
        </div>
      ) : !data ? (
        <div className="rounded-3xl border border-brand-purple/12 bg-white p-10 text-center text-sm text-content-muted shadow-card">
          No reporting data available yet.
        </div>
      ) : (
        <div className="space-y-6">
          <Section title="Executive Dashboard" description="Platform-level request, customer, and revenue overview using the current Twinity data model.">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Total Requests" value={data.executive.totalRequests} sub={`${data.executive.pendingRequests} pending or in progress`} />
              <StatCard label="Delivered Requests" value={data.executive.deliveredRequests} sub={`${data.executive.reviewRequests} currently in review`} />
              <StatCard label="Customers" value={data.executive.totalUsers} sub={`${data.executive.activeCelebrities} active celebrities`} />
              <StatCard label="Lead Revenue" value={formatMoney(data.executive.totalLeadRevenue)} sub={`Request value ${formatMoney(data.executive.requestRevenue)}`} />
            </div>
          </Section>

          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <Section title="Ad Service Type Dashboard" description="Current request mix and commercial value by service type.">
              <div className="overflow-hidden rounded-2xl border border-brand-purple/10">
                <table className="w-full">
                  <thead className="bg-surface-subtle/60">
                    <tr className="text-left text-xs font-semibold uppercase tracking-[0.12em] text-content-muted">
                      <th className="px-4 py-3">Service</th>
                      <th className="px-4 py-3">Total</th>
                      <th className="px-4 py-3">Delivered</th>
                      <th className="px-4 py-3">Review</th>
                      <th className="px-4 py-3">Failed</th>
                      <th className="px-4 py-3">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-purple/8 bg-white">
                    {data.serviceTypes.map((row) => (
                      <tr key={row.productType} className="text-sm text-content-secondary">
                        <td className="px-4 py-3 font-semibold text-content-primary">{productTypeLabel(row.productType)}</td>
                        <td className="px-4 py-3">{row.total}</td>
                        <td className="px-4 py-3 text-emerald-700">{row.delivered}</td>
                        <td className="px-4 py-3 text-amber-700">{row.review}</td>
                        <td className="px-4 py-3 text-red-600">{row.failed}</td>
                        <td className="px-4 py-3">{formatMoney(row.revenue)}</td>
                      </tr>
                    ))}
                    {data.serviceTypes.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-sm text-content-muted">No service activity in this date range.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </Section>

            <Section title="Approval Dashboard" description="Review-state requests grouped by who still needs to act before delivery can happen.">
              <div className="grid gap-4 sm:grid-cols-2">
                <StatCard label="In Review" value={data.approval.totalReview} sub="Total requests in review state" />
                <StatCard label="Waiting Creator" value={data.approval.waitingCreator} sub="Celebrity or manager approval still pending" tone="warning" />
                <StatCard label="Waiting Client" value={data.approval.waitingClient} sub="Creator approved, client approval still pending" />
                <StatCard label="Ready to Deliver" value={data.approval.readyForDelivery} sub="Both approvals complete" tone="success" />
              </div>
            </Section>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Section title="Revision Dashboard" description="Current revision demand and how often requests are being escalated or classified as material.">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <StatCard label="Total Revisions" value={data.revision.total} sub={`${data.revision.pending} pending`} />
                <StatCard label="Minor" value={data.revision.minor} sub={`${data.revision.material} material`} />
                <StatCard label="Escalated" value={data.revision.escalated} sub={`${data.revision.rejected} rejected`} tone="warning" />
                <StatCard label="Approved" value={data.revision.approved} tone="success" />
                <StatCard label="Rejected" value={data.revision.rejected} tone="danger" />
                <StatCard label="Pending" value={data.revision.pending} />
              </div>
            </Section>

            <Section title="Payment Dashboard" description="Refund operations view using the existing refund workflow and settlement fields.">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <StatCard label="Refund Requests" value={data.payment.totalRefundRequests} />
                <StatCard label="Requested" value={data.payment.requested} sub={formatMoney(data.payment.requestedAmount)} tone="warning" />
                <StatCard label="Approved" value={data.payment.approved} sub={formatMoney(data.payment.approvedAmount)} tone="success" />
                <StatCard label="Processed" value={data.payment.processed} />
                <StatCard label="Partial" value={data.payment.partial} />
                <StatCard label="Rejected" value={data.payment.rejected} tone="danger" />
              </div>
            </Section>
          </div>

          <Section title="Compliance Dashboard" description="Current governance indicators available from request validation, support escalation, and user status controls.">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <StatCard label="Full Review Route" value={data.compliance.fullReviewRouted} sub="Requests routed outside fast-track" />
              <StatCard label="Support Escalations" value={data.compliance.supportEscalations} sub="Requests escalated to support" tone="warning" />
              <StatCard label="Business Verification" value={data.compliance.businessVerificationRequired} sub="Requests requiring business checks" />
              <StatCard label="Validation Issues" value={data.compliance.validationIssues} sub="Requests that stored validation errors" tone="warning" />
              <StatCard label="Blocked Users" value={data.compliance.blockedUsers} sub="Current blocked customer accounts" tone="danger" />
              <StatCard label="Failed Requests" value={data.compliance.failedRequests} sub="Operational failures in the selected period" tone="danger" />
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <Insight icon={<ClipboardCheck className="h-4 w-4" />} title="Approval coverage" body="This view is based on the same creator/client approval markers already used in the CS review flow." />
              <Insight icon={<Wallet className="h-4 w-4" />} title="Refund operations" body="Payment reporting currently reflects refund workflow status and amounts; gateway settlement analytics are still a separate later step." />
              <Insight icon={<ShieldAlert className="h-4 w-4" />} title="Compliance depth" body="This is the strongest BRD-safe version we can ship now using current validation, escalation, and user governance data." />
            </div>
          </Section>
        </div>
      )}
    </div>
  )
}

function Insight({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-brand-purple/10 bg-surface-subtle/30 p-4">
      <div className="flex items-center gap-2 text-brand-purple">
        {icon}
        <p className="text-sm font-semibold text-content-primary">{title}</p>
      </div>
      <p className="mt-2 text-sm text-content-muted">{body}</p>
    </div>
  )
}
