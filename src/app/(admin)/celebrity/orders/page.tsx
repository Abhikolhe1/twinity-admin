'use client'

import { useEffect, useState } from 'react'
import { adminApi } from '@/lib/api'

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

export default function CelebrityOrdersPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [actingJobId, setActingJobId] = useState<string | null>(null)
  const [error, setError] = useState('')

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
    try {
      await adminApi.celebrityApproveJob(jobId)
      await loadJobs()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve request')
    } finally {
      setActingJobId(null)
    }
  }

  async function rejectJob(jobId: string) {
    const note = promptRejectReason()
    if (note === null) return
    setActingJobId(jobId)
    setError('')
    try {
      await adminApi.celebrityRejectJob(jobId, note)
      await loadJobs()
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
                <span className="inline-flex rounded-full bg-surface-subtle px-3 py-1 text-xs font-semibold capitalize text-content-secondary">
                  {job.status.replace(/[-_]/g, ' ')}
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
                      onClick={() => rejectJob(job.id)}
                      disabled={actingJobId === job.id}
                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-60"
                    >
                      Reject
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-content-muted">No action</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
