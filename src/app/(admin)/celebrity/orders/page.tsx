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

export default function CelebrityOrdersPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    adminApi.celebrityJobs()
      .then((res: any) => setJobs(res.data || []))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

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
        <div className="grid grid-cols-[1.1fr_1fr_0.7fr_0.8fr] gap-4 border-b border-brand-purple/8 px-6 py-4 text-xs font-bold uppercase tracking-[0.14em] text-content-muted">
          <span>Order</span>
          <span>Customer</span>
          <span>Status</span>
          <span>Price</span>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-content-muted">Loading orders...</div>
        ) : error ? (
          <div className="p-10 text-center text-sm text-red-500">{error}</div>
        ) : jobs.length === 0 ? (
          <div className="p-10 text-center text-sm text-content-muted">No orders linked to your portal yet.</div>
        ) : (
          jobs.map((job) => (
            <div key={job.id} className="grid grid-cols-[1.1fr_1fr_0.7fr_0.8fr] gap-4 border-b border-brand-purple/6 px-6 py-5 last:border-b-0">
              <div>
                <p className="text-sm font-semibold text-content-primary">{job.reference_id}</p>
                <p className="mt-1 text-xs text-content-muted">{job.product_type.replace('-', ' ')} • {job.purpose}</p>
                <p className="mt-2 text-xs text-content-muted">{new Date(job.created_at).toLocaleDateString('en-GB')}</p>
              </div>
              <div className="text-sm text-content-secondary">
                <p className="font-medium text-content-primary">{job.user?.name || 'Unknown customer'}</p>
                <p className="mt-1 text-xs text-content-muted">{job.user?.email || '—'}</p>
              </div>
              <div>
                <span className="inline-flex rounded-full bg-surface-subtle px-3 py-1 text-xs font-semibold capitalize text-content-secondary">
                  {job.status.replace('_', ' ').replace('-', ' ')}
                </span>
              </div>
              <div className="text-sm font-semibold text-content-primary">
                ${job.estimated_price.toLocaleString()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
