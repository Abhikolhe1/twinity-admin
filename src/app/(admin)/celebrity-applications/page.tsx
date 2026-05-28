'use client'

import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Search, XCircle } from 'lucide-react'
import { adminApi, type CelebrityApplication } from '@/lib/api'
import { usePermissions } from '@/lib/permissions-context'

type FilterStatus = 'all' | 'pending_review' | 'approved' | 'rejected'

export default function CelebrityApplicationsPage() {
  const permissions = usePermissions()
  const canManage = permissions.includes('celebrity_applications.manage')
  const [applications, setApplications] = useState<CelebrityApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<FilterStatus>('pending_review')
  const [submittingId, setSubmittingId] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState<CelebrityApplication | null>(null)
  const [rejectNote, setRejectNote] = useState('')

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (status !== 'all') params.set('status', status)
      if (search.trim()) params.set('search', search.trim())
      const res = await adminApi.celebrityApplications(params.toString())
      setApplications(res.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [status])

  const filtered = useMemo(() => {
    if (!search.trim()) return applications
    const q = search.trim().toLowerCase()
    return applications.filter((app) =>
      app.name.toLowerCase().includes(q) ||
      app.contact_email?.toLowerCase().includes(q) ||
      app.industry.toLowerCase().includes(q)
    )
  }, [applications, search])

  async function approve(id: string) {
    setSubmittingId(id)
    try {
      await adminApi.approveCelebrityApplication(id)
      await load()
    } finally {
      setSubmittingId(null)
    }
  }

  async function reject() {
    if (!rejecting) return
    setSubmittingId(rejecting.id)
    try {
      await adminApi.rejectCelebrityApplication(rejecting.id, rejectNote)
      setRejecting(null)
      setRejectNote('')
      await load()
    } finally {
      setSubmittingId(null)
    }
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-purple">Review Queue</p>
          <h1 className="mt-2 text-2xl font-bold text-content-primary">Celebrity Applications</h1>
          <p className="mt-1 text-sm text-content-muted">
            Review onboarding requests, approve portal access, and keep the intake pipeline clean.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search applicant"
              className="w-full rounded-xl border border-brand-purple/20 bg-white py-2.5 pl-9 pr-3 text-sm text-content-primary outline-none transition-all focus:border-brand-purple sm:w-64"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as FilterStatus)}
            className="rounded-xl border border-brand-purple/20 bg-white px-3 py-2.5 text-sm text-content-primary outline-none transition-all focus:border-brand-purple"
          >
            <option value="all">All statuses</option>
            <option value="pending_review">Pending review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <button
            type="button"
            onClick={load}
            className="rounded-xl border border-brand-purple/20 bg-white px-4 py-2.5 text-sm font-medium text-content-secondary transition-all hover:bg-surface-subtle"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-brand-purple/12 bg-white shadow-card">
        <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr] gap-4 border-b border-brand-purple/8 px-6 py-4 text-xs font-bold uppercase tracking-[0.14em] text-content-muted">
          <span>Applicant</span>
          <span>Details</span>
          <span>Status</span>
          <span>Actions</span>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-content-muted">Loading applications...</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-content-muted">No celebrity applications found.</div>
        ) : (
          filtered.map((app) => (
            <div key={app.id} className="grid grid-cols-[1.4fr_1fr_1fr_1fr] gap-4 border-b border-brand-purple/6 px-6 py-5 last:border-b-0">
              <div>
                <p className="text-sm font-semibold text-content-primary">{app.name}</p>
                <p className="mt-1 text-xs text-content-muted">{app.contact_email || 'No email provided'}</p>
                <p className="mt-2 text-xs leading-5 text-content-muted">{app.bio || 'No introduction submitted yet.'}</p>
              </div>
              <div className="text-xs leading-6 text-content-secondary">
                <p><span className="font-semibold text-content-primary">Industry:</span> {app.industry}</p>
                <p><span className="font-semibold text-content-primary">Nationality:</span> {app.nationality}</p>
                <p><span className="font-semibold text-content-primary">Region:</span> {app.region || '—'}</p>
                <p><span className="font-semibold text-content-primary">Applied:</span> {new Date(app.applied_at).toLocaleDateString('en-GB')}</p>
              </div>
              <div>
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                  app.onboarding_status === 'approved'
                    ? 'bg-emerald-50 text-emerald-700'
                    : app.onboarding_status === 'rejected'
                      ? 'bg-red-50 text-red-600'
                      : 'bg-amber-50 text-amber-700'
                }`}>
                  {app.onboarding_status.replace('_', ' ')}
                </span>
                {app.portal_admin?.email && (
                  <p className="mt-3 text-xs text-content-muted">Portal: {app.portal_admin.email}</p>
                )}
                {app.review_notes && (
                  <p className="mt-2 text-xs leading-5 text-content-muted">Note: {app.review_notes}</p>
                )}
              </div>
              <div className="flex items-start gap-2">
                {canManage && app.onboarding_status === 'pending_review' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => approve(app.id)}
                      disabled={submittingId === app.id}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition-all hover:bg-emerald-700 disabled:opacity-60"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {submittingId === app.id ? 'Approving...' : 'Approve'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRejecting(app)}
                      disabled={submittingId === app.id}
                      className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition-all hover:bg-red-50 disabled:opacity-60"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Reject
                    </button>
                  </>
                ) : (
                  <span className="text-xs text-content-muted">
                    {app.onboarding_status === 'approved' ? 'Credentials already issued' : 'No actions available'}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {rejecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-brand-purple/12 bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-content-primary">Reject application</h2>
            <p className="mt-2 text-sm text-content-muted">
              Add an optional reason for rejecting {rejecting.name}. This note stays in the review log.
            </p>
            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              rows={4}
              className="mt-4 w-full rounded-2xl border border-brand-purple/20 px-4 py-3 text-sm text-content-primary outline-none transition-all focus:border-brand-purple"
              placeholder="Reason for rejection"
            />
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => { setRejecting(null); setRejectNote('') }}
                className="rounded-xl px-4 py-2.5 text-sm font-medium text-content-secondary transition-all hover:bg-surface-subtle"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={reject}
                disabled={submittingId === rejecting.id}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-red-700 disabled:opacity-60"
              >
                {submittingId === rejecting.id ? 'Rejecting...' : 'Reject application'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
