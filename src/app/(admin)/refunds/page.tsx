'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Eye, Loader2, Search, Wallet, XCircle } from 'lucide-react'

import { adminApi, type AdminRefundRequest } from '@/lib/api'
import { PageLoader } from '@/components/ui/Spinner'

const STATUS_STYLES: Record<string, string> = {
  requested: 'bg-amber-100 text-amber-700',
  approved: 'bg-sky-100 text-sky-700',
  partial: 'bg-violet-100 text-violet-700',
  rejected: 'bg-red-100 text-red-700',
  processed: 'bg-emerald-100 text-emerald-700',
}

function money(amount?: number | null, currency = 'USD') {
  if (amount == null) return '—'
  return `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmt(date?: string | null) {
  return date ? new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
}

function RefundModal({
  refund,
  onClose,
  onUpdated,
}: {
  refund: AdminRefundRequest
  onClose: () => void
  onUpdated: (refund: AdminRefundRequest) => void
}) {
  const [approvedAmount, setApprovedAmount] = useState(
    refund.approved_amount ?? refund.requested_amount ?? refund.video_job.estimated_price,
  )
  const [note, setNote] = useState(refund.admin_note ?? '')
  const [paymentGateway, setPaymentGateway] = useState(refund.payment_gateway ?? '')
  const [paymentReference, setPaymentReference] = useState(refund.payment_reference ?? '')
  const [busyAction, setBusyAction] = useState<'approve' | 'reject' | 'process' | null>(null)
  const [error, setError] = useState('')

  async function approve() {
    setBusyAction('approve')
    setError('')
    try {
      const res = await adminApi.approveRefund(refund.id, { approvedAmount, note })
      onUpdated(res.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approval failed')
      setBusyAction(null)
    }
  }

  async function reject() {
    setBusyAction('reject')
    setError('')
    try {
      const res = await adminApi.rejectRefund(refund.id, note)
      onUpdated(res.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rejection failed')
      setBusyAction(null)
    }
  }

  async function process() {
    setBusyAction('process')
    setError('')
    try {
      const res = await adminApi.processRefund(refund.id, { paymentGateway, paymentReference, note })
      onUpdated(res.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Processing failed')
      setBusyAction(null)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-3xl rounded-2xl border border-brand-purple/10 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-brand-purple/10 px-6 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-purple">Refund Request</p>
              <h2 className="mt-1 text-lg font-bold text-content-primary">{refund.video_job.reference_id}</h2>
            </div>
            <button onClick={onClose} className="rounded-full p-2 text-content-muted transition hover:bg-surface-subtle hover:text-content-primary">
              <XCircle className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-6 px-6 py-5 md:grid-cols-[1.3fr_0.9fr]">
            <div className="space-y-4">
              <div className="rounded-2xl border border-brand-purple/10 bg-surface-subtle p-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-content-muted">Customer Reason</p>
                <p className="mt-2 text-sm leading-6 text-content-secondary">{refund.reason}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ['Customer', refund.user.name],
                  ['Email', refund.user.email],
                  ['Celebrity', refund.video_job.celebrity.name],
                  ['Product', refund.video_job.product_type],
                  ['Requested', money(refund.requested_amount, refund.currency)],
                  ['Current Status', refund.status],
                  ['Requested At', fmt(refund.requested_at)],
                  ['Job Status', refund.video_job.status],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-brand-purple/10 bg-white px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-content-muted">{label}</p>
                    <p className="mt-1 text-sm font-semibold text-content-primary">{value}</p>
                  </div>
                ))}
              </div>

              {refund.video_job.error_message && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-red-600">Failure Reason</p>
                  <p className="mt-2 text-sm leading-6 text-red-700">{refund.video_job.error_message}</p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-brand-purple/10 bg-white p-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-content-muted">Decision Note</p>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={5}
                  className="mt-2 w-full rounded-xl border border-brand-purple/12 px-3 py-2 text-sm text-content-primary outline-none focus:border-brand-purple"
                  placeholder="Add an internal or customer-facing note..."
                />
              </div>

              {(refund.status === 'requested' || refund.status === 'approved' || refund.status === 'partial') && (
                <div className="rounded-2xl border border-brand-purple/10 bg-white p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-content-muted">Amounts & Settlement</p>
                  <label className="mt-3 block text-xs font-semibold text-content-secondary">Approved Amount</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={approvedAmount}
                    onChange={(event) => setApprovedAmount(Number(event.target.value))}
                    className="mt-1 w-full rounded-xl border border-brand-purple/12 px-3 py-2 text-sm text-content-primary outline-none focus:border-brand-purple"
                  />
                  <label className="mt-3 block text-xs font-semibold text-content-secondary">Payment Gateway</label>
                  <input
                    value={paymentGateway}
                    onChange={(event) => setPaymentGateway(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-brand-purple/12 px-3 py-2 text-sm text-content-primary outline-none focus:border-brand-purple"
                    placeholder="Manual / Stripe / PayTabs..."
                  />
                  <label className="mt-3 block text-xs font-semibold text-content-secondary">Payment Reference</label>
                  <input
                    value={paymentReference}
                    onChange={(event) => setPaymentReference(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-brand-purple/12 px-3 py-2 text-sm text-content-primary outline-none focus:border-brand-purple"
                    placeholder="Gateway transaction or finance reference"
                  />
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-3 border-t border-brand-purple/10 px-6 py-4">
            {refund.status === 'requested' && (
              <>
                <button
                  onClick={reject}
                  disabled={busyAction !== null || note.trim().length === 0}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                >
                  {busyAction === 'reject' && <Loader2 className="h-4 w-4 animate-spin" />}
                  Reject
                </button>
                <button
                  onClick={approve}
                  disabled={busyAction !== null}
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg,#9a78fe,#422266)' }}
                >
                  {busyAction === 'approve' && <Loader2 className="h-4 w-4 animate-spin" />}
                  Approve
                </button>
              </>
            )}
            {(refund.status === 'approved' || refund.status === 'partial') && (
              <button
                onClick={process}
                disabled={busyAction !== null}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
              >
                {busyAction === 'process' && <Loader2 className="h-4 w-4 animate-spin" />}
                Mark Processed
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default function RefundsPage() {
  const [refunds, setRefunds] = useState<AdminRefundRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | AdminRefundRequest['status']>('all')
  const [search, setSearch] = useState('')
  const [selectedRefund, setSelectedRefund] = useState<AdminRefundRequest | null>(null)
  const [error, setError] = useState('')

  const fetchRefunds = useCallback(() => {
    setLoading(true)
    setError('')
    const params = new URLSearchParams()
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (search.trim()) params.set('search', search.trim())
    adminApi.refunds(params.toString())
      .then((res) => setRefunds(res.data || []))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load refund requests'))
      .finally(() => setLoading(false))
  }, [search, statusFilter])

  useEffect(() => {
    fetchRefunds()
  }, [fetchRefunds])

  const counts = useMemo(() => refunds.reduce<Record<string, number>>((acc, refund) => {
    acc[refund.status] = (acc[refund.status] || 0) + 1
    return acc
  }, {}), [refunds])

  return (
    <div className="p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-content-primary">Refund Requests</h1>
          <p className="mt-1 text-sm text-content-muted">Review failed-request refund cases and mark settlements.</p>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-brand-purple/10 bg-white px-4 py-3">
          <Wallet className="h-4 w-4 text-brand-purple" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Open Requests</p>
            <p className="text-sm font-bold text-content-primary">{counts.requested || 0}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="mb-5 flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-muted" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by ref, customer, celebrity..."
            className="w-72 rounded-xl border border-brand-purple/20 bg-white py-2 pl-9 pr-4 text-sm text-content-primary outline-none focus:border-brand-purple"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(['all', 'requested', 'approved', 'partial', 'processed', 'rejected'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-all ${
                statusFilter === status
                  ? 'text-white'
                  : 'border border-brand-purple/20 bg-white text-content-secondary hover:border-brand-purple/40 hover:text-brand-purple'
              }`}
              style={statusFilter === status ? { background: 'linear-gradient(135deg,#9a78fe,#422266)' } : {}}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-brand-purple/12 bg-white shadow-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-brand-purple/8">
              {['Reference', 'Customer', 'Celebrity', 'Status', 'Requested', 'Amount', 'Submitted', 'Action'].map((head) => (
                <th key={head} className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-content-muted">{head}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-purple/6">
            {loading && (
              <tr>
                <td colSpan={8} className="px-5 py-12">
                  <PageLoader />
                </td>
              </tr>
            )}
            {!loading && refunds.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-10 text-center text-sm text-content-muted">No refund requests found.</td>
              </tr>
            )}
            {!loading && refunds.map((refund) => (
              <tr key={refund.id} className="hover:bg-surface-subtle/40 transition-colors">
                <td className="px-5 py-3.5">
                  <p className="font-semibold text-content-primary">{refund.video_job.reference_id}</p>
                  <p className="text-xs text-content-muted">{refund.video_job.purpose}</p>
                </td>
                <td className="px-5 py-3.5">
                  <p className="font-medium text-content-primary">{refund.user.name}</p>
                  <p className="text-xs text-content-muted">{refund.user.email}</p>
                </td>
                <td className="px-5 py-3.5 text-content-secondary">{refund.video_job.celebrity.name}</td>
                <td className="px-5 py-3.5">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${STATUS_STYLES[refund.status] || 'bg-surface-subtle text-content-muted'}`}>
                    {refund.status}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-content-secondary">{money(refund.requested_amount, refund.currency)}</td>
                <td className="px-5 py-3.5 text-content-secondary">{money(refund.approved_amount, refund.currency)}</td>
                <td className="px-5 py-3.5 text-xs text-content-muted">{fmt(refund.requested_at)}</td>
                <td className="px-5 py-3.5">
                  <button
                    onClick={() => setSelectedRefund(refund)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-brand-purple/25 px-3 py-1.5 text-xs font-semibold text-brand-purple transition hover:bg-brand-purple/8"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedRefund && (
        <RefundModal
          refund={selectedRefund}
          onClose={() => setSelectedRefund(null)}
          onUpdated={(updated) => {
            setRefunds((prev) => prev.map((entry) => entry.id === updated.id ? updated : entry))
            setSelectedRefund(updated)
          }}
        />
      )}
    </div>
  )
}
