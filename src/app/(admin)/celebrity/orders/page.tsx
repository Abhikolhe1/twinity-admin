'use client'

import { useEffect, useState } from 'react'
import { adminApi } from '@/lib/api'
import RejectReasonModal from '@/components/RejectReasonModal'

const STATUS_COLORS: Record<string, string> = {
  delivered: 'bg-emerald-100 text-emerald-700',
  'in-progress': 'bg-surface-elevated text-brand-purple',
  review: 'bg-amber-100 text-amber-700',
  pending: 'bg-surface-subtle text-content-muted',
  failed: 'bg-red-100 text-red-700',
  cancelled: 'bg-surface-subtle text-content-muted',
}

const toUiStatus = (status?: string) => status === 'in_progress' ? 'in-progress' : status || 'pending'

type Job = {
  id: string
  reference_id: string
  product_type: string
  purpose: string
  status: string
  estimated_price: number
  created_at: string
  user?: { name: string; email: string }
}

export default function CelebrityOrdersPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [actingJobId, setActingJobId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [rejectJobId, setRejectJobId] = useState<string | null>(null)

  async function loadJobs() {
    const res = await adminApi.celebrityJobs() as { data?: Job[] }
    setJobs(res.data || [])
  }

  useEffect(() => {
    loadJobs()
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  async function approveJob(jobId: string) {
    setActingJobId(jobId)
    setError('')
    setSuccessMessage('')
    try {
      await adminApi.celebrityApproveJob(jobId)
      await loadJobs()
      setSuccessMessage('Request approved successfully.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve request')
    } finally {
      setActingJobId(null)
    }
  }

  async function rejectJob(jobId: string, note: string) {
    setActingJobId(jobId)
    setError('')
    setSuccessMessage('')
    try {
      await adminApi.celebrityRejectJob(jobId, note)
      await loadJobs()
      setRejectJobId(null)
      setSuccessMessage('Request rejected successfully.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject request')
    } finally {
      setActingJobId(null)
    }
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-purple">Celebrity Portal</p>
        <h1 className="mt-2 text-2xl font-bold text-content-primary">My Orders</h1>
        <p className="mt-1 text-sm text-content-muted">
          View the requests assigned to your celebrity identity. This list is scoped only to your own portal account.
        </p>
      </div>

      {successMessage && (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      )}

      <div className="overflow-hidden rounded-3xl border border-brand-purple/12 bg-white shadow-card">
        <div className="grid grid-cols-[1.1fr_1fr_0.7fr_0.8fr_0.9fr] gap-4 border-b border-brand-purple/8 px-6 py-4 text-xs font-bold uppercase tracking-[0.14em] text-content-muted">
          <span>Order</span>
          <span>Customer</span>
          <span>Status</span>
          <span>Price</span>
          <span>Action</span>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-content-muted">Loading orders...</div>
        ) : error ? (
          <div className="p-10 text-center text-sm text-red-500">{error}</div>
        ) : jobs.length === 0 ? (
          <div className="p-10 text-center text-sm text-content-muted">No orders linked to your portal yet.</div>
        ) : (
          jobs.map((job) => (
            <div key={job.id} className="grid grid-cols-[1.1fr_1fr_0.7fr_0.8fr_0.9fr] gap-4 border-b border-brand-purple/6 px-6 py-5 last:border-b-0">
              <div>
                <p className="text-sm font-semibold text-content-primary">{job.reference_id}</p>
                <p className="mt-1 text-xs text-content-muted">{job.product_type.replace(/[-_]/g, ' ')} | {job.purpose}</p>
                <p className="mt-2 text-xs text-content-muted">{new Date(job.created_at).toLocaleDateString('en-GB')}</p>
              </div>
              <div className="text-sm text-content-secondary">
                <p className="font-medium text-content-primary">{job.user?.name || 'Unknown customer'}</p>
                <p className="mt-1 text-xs text-content-muted">{job.user?.email || '-'}</p>
              </div>
              <div>
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${STATUS_COLORS[toUiStatus(job.status)] || 'bg-surface-subtle text-content-secondary'}`}>
                  {toUiStatus(job.status).replace(/[-_]/g, ' ')}
                </span>
              </div>
              <div className="text-sm font-semibold text-content-primary">
                ${job.estimated_price.toLocaleString()}
              </div>
              <div>
                {job.status === 'review' ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => approveJob(job.id)}
                      disabled={actingJobId === job.id}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                    >
                      {actingJobId === job.id ? 'Saving...' : 'Approve'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRejectJobId(job.id)}
                      disabled={actingJobId === job.id}
                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-60"
                    >
                      Reject
                    </button>
                  </div>
                ) : (
                  <ActionState job={job} />
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <RejectReasonModal
        open={Boolean(rejectJobId)}
        loading={Boolean(rejectJobId && actingJobId === rejectJobId)}
        onClose={() => setRejectJobId(null)}
        onSubmit={(reason) => rejectJob(rejectJobId!, reason)}
      />
    </div>
  )
}

function ActionState({ job }: { job: Job }) {
  const status = job.status.toLowerCase()

  if (status === 'failed' || status === 'cancelled') {
    return (
      <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
        Rejected
      </span>
    )
  }

  if (status === 'delivered') {
    return (
      <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
        Approved
      </span>
    )
  }

  if (status === 'pending' || status === 'in_progress' || status === 'in-progress') {
    return (
      <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
        In progress
      </span>
    )
  }

  return (
    <span className="inline-flex rounded-full bg-surface-subtle px-3 py-1 text-xs font-semibold capitalize text-content-secondary">
      {job.status.replace(/[-_]/g, ' ')}
    </span>
  )
}
