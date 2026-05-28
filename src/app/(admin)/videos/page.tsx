'use client'
import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Download, Search, X, CheckCircle2, XCircle, Eye, Loader2, Video } from 'lucide-react'
import { adminApi } from '@/lib/api'
import Spinner, { PageLoader } from '@/components/ui/Spinner'
import { usePermissions } from '@/lib/permissions-context'

const STATUS_COLORS: Record<string, string> = {
  delivered:    'bg-emerald-100 text-emerald-700',
  'in-progress':'bg-surface-elevated text-brand-purple',
  review:       'bg-amber-100 text-amber-700',
  pending:      'bg-surface-subtle text-content-muted',
  failed:       'bg-red-100 text-red-700',
  cancelled:    'bg-surface-subtle text-content-muted',
}
const STATUSES = ['pending', 'in-progress', 'review', 'delivered', 'failed', 'cancelled']

const fmt = (d: string) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

// ── Review Modal ─────────────────────────────────────────────────────────────
function ReviewModal({
  job,
  onClose,
  onApproved,
  onRejected,
}: {
  job: any
  onClose: () => void
  onApproved: (id: string) => void
  onRejected: (id: string) => void
}) {
  const [rejecting, setRejecting] = useState(false)
  const [rejectNote, setRejectNote] = useState('')
  const [approving, setApproving] = useState(false)
  const [rejectingBusy, setRejectingBusy] = useState(false)
  const [error, setError] = useState('')

  async function approve() {
    setApproving(true)
    setError('')
    try {
      await adminApi.approveJob(job.id)
      onApproved(job.id)
    } catch (err: any) {
      setError(err.message || 'Approval failed')
      setApproving(false)
    }
  }

  async function reject() {
    setRejectingBusy(true)
    setError('')
    try {
      await adminApi.rejectJob(job.id, rejectNote.trim())
      onRejected(job.id)
    } catch (err: any) {
      setError(err.message || 'Rejection failed')
      setRejectingBusy(false)
    }
  }

  const assetUrl  = job.watermarked_url || job.preview_url || job.final_video_url || ''
  const isImageAd = job.product_type === 'image_ad' || job.product_type === 'image-ad'

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-brand-purple/10 shrink-0">
            <div>
              <h2 className="text-base font-bold text-content-primary">CS Review</h2>
              <p className="text-xs text-content-muted font-mono mt-0.5">{job.reference_id}</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-content-muted hover:text-content-primary hover:bg-surface-subtle transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">

            {/* Video preview */}
            <div className="rounded-xl overflow-hidden bg-black aspect-video min-h-[300px] flex items-center justify-center border border-brand-purple/10">
              {assetUrl ? (
                isImageAd ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={assetUrl}
                    alt="Ad image preview"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <video
                    src={assetUrl}
                    controls
                    className="w-full h-full object-contain"
                    preload="metadata"
                    controlsList="nodownload"
                  />
                )
              ) : (
                <div className="flex flex-col items-center gap-2 text-white/50">
                  <Video className="w-10 h-10" />
                  <p className="text-xs">No preview available yet</p>
                </div>
              )}
            </div>

            {/* Job details */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Celebrity', value: job.celebrity?.name || '—' },
                { label: 'Product', value: job.product_type || '—' },
                { label: 'Customer', value: job.user?.name || '—' },
                { label: 'Email', value: job.user?.email || '—' },
                { label: 'Duration', value: job.duration || '—' },
                { label: 'Aspect Ratio', value: job.aspect_ratio || '—' },
                { label: 'Submitted', value: fmt(job.created_at) },
                { label: 'Est. Price', value: `$${(job.estimated_price || 0).toLocaleString()}` },
              ].map(({ label, value }) => (
                <div key={label} className="bg-surface-subtle rounded-xl px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-content-muted mb-0.5">{label}</p>
                  <p className="text-sm font-semibold text-content-primary">{value}</p>
                </div>
              ))}
            </div>

            {/* Script */}
            {(job.processedScript || job.script) && (
              <div className="bg-surface-subtle rounded-xl px-4 py-3">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-content-muted">
                    {job.processedScript ? 'Script Sent to ElevenLabs' : 'Script'}
                  </p>
                  {job.processedScript && job.script !== job.processedScript && (
                    <span className="text-[10px] text-brand-purple font-semibold">Processed</span>
                  )}
                </div>
                <p className="text-sm text-content-secondary leading-relaxed whitespace-pre-wrap">
                  {job.processedScript || job.script}
                </p>
                {job.processedScript && job.script && job.script !== job.processedScript && (
                  <details className="mt-3">
                    <summary className="text-[10px] font-bold uppercase tracking-wider text-content-muted cursor-pointer select-none">
                      Original Script
                    </summary>
                    <p className="text-sm text-content-muted leading-relaxed whitespace-pre-wrap mt-1.5">{job.script}</p>
                  </details>
                )}
              </div>
            )}

            {/* Purpose / Tone */}
            {(job.purpose || job.tone) && (
              <div className="flex gap-3">
                {job.purpose && (
                  <div className="flex-1 bg-surface-subtle rounded-xl px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-content-muted mb-0.5">Purpose</p>
                    <p className="text-sm text-content-secondary capitalize">{job.purpose}</p>
                  </div>
                )}
                {job.tone && (
                  <div className="flex-1 bg-surface-subtle rounded-xl px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-content-muted mb-0.5">Tone</p>
                    <p className="text-sm text-content-secondary capitalize">{job.tone}</p>
                  </div>
                )}
              </div>
            )}

            {/* Rejection form */}
            {rejecting && (
              <div className="border border-red-200 rounded-xl p-4 flex flex-col gap-3">
                <p className="text-sm font-semibold text-red-700">Rejection Reason</p>
                <textarea
                  value={rejectNote}
                  onChange={e => setRejectNote(e.target.value)}
                  rows={3}
                  placeholder="Describe the issue so the customer can understand (optional)..."
                  className="w-full px-3 py-2 text-sm rounded-xl border border-red-200 bg-white text-content-primary focus:outline-none focus:border-red-400 transition-colors resize-none placeholder:text-content-muted"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { setRejecting(false); setRejectNote('') }}
                    className="flex-1 py-2 rounded-xl text-sm font-medium border border-brand-purple/20 text-content-secondary hover:bg-surface-subtle transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={reject}
                    disabled={rejectingBusy}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-all disabled:opacity-60"
                  >
                    {rejectingBusy && <Loader2 className="w-4 h-4 animate-spin" />}
                    Confirm Reject
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          {!rejecting && (
            <div className="px-6 py-4 border-t border-brand-purple/10 flex gap-3 shrink-0 bg-white">
              <button
                onClick={() => setRejecting(true)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50 transition-all"
              >
                <XCircle className="w-4 h-4" /> Reject
              </button>
              <button
                onClick={approve}
                disabled={approving}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg,#9a78fe,#422266)' }}
              >
                {approving
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <CheckCircle2 className="w-4 h-4" />}
                {approving ? 'Approving...' : 'Approve & Deliver'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function VideosPage() {
  const searchParams = useSearchParams()
  const [jobs, setJobs] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState(() => searchParams.get('search') ?? '')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [updatingStatus, setUpdatingStatus] = useState<Set<string>>(new Set())
  const [enablingDownload, setEnablingDownload] = useState<Set<string>>(new Set())
  const [reviewJob, setReviewJob] = useState<any | null>(null)
  const permissions = usePermissions()
  const canManage = permissions.includes('videos.manage')

  const fetchJobs = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (statusFilter !== 'all') params.set('status', statusFilter)
    adminApi.jobs(params.toString())
      .then((res: any) => {
        setJobs(res.data || [])
        setTotal(res.total || 0)
      })
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [statusFilter])

  useEffect(() => { fetchJobs() }, [fetchJobs])

  const filtered = search
    ? jobs.filter(j =>
        j.reference_id?.includes(search) ||
        j.user?.name?.toLowerCase().includes(search.toLowerCase())
      )
    : jobs

  async function updateStatus(id: string, status: string) {
    if (updatingStatus.has(id)) return
    setUpdatingStatus(prev => new Set(prev).add(id))
    try {
      await adminApi.updateJobStatus(id, { status })
      setJobs(prev => prev.map(j => j.id === id ? { ...j, status } : j))
    } catch {}
    setUpdatingStatus(prev => { const s = new Set(prev); s.delete(id); return s })
  }

  async function enableDownload(id: string) {
    if (enablingDownload.has(id)) return
    setEnablingDownload(prev => new Set(prev).add(id))
    try {
      await adminApi.enableDownload(id)
      setJobs(prev => prev.map(j => j.id === id ? { ...j, download_enabled: true } : j))
    } catch {}
    setEnablingDownload(prev => { const s = new Set(prev); s.delete(id); return s })
  }

  function onApproved(id: string) {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, status: 'delivered', download_enabled: true } : j))
    setReviewJob(null)
  }

  function onRejected(id: string) {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, status: 'failed' } : j))
    setReviewJob(null)
  }

  const colCount = canManage ? 8 : 6

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-content-primary">Video Jobs</h1>
        <p className="text-sm text-content-muted mt-1">{total} total jobs</p>
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative">
          <Search className="w-4 h-4 text-content-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by ref or user..."
            className="pl-9 pr-4 py-2 rounded-xl border border-brand-purple/20 text-sm outline-none focus:border-brand-purple bg-white text-content-primary placeholder:text-content-muted w-60 transition-colors" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {['all', 'pending', 'in-progress', 'review', 'delivered', 'failed'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-all ${
                statusFilter === s
                  ? 'text-white'
                  : 'bg-white border border-brand-purple/20 text-content-secondary hover:border-brand-purple/40 hover:text-brand-purple'
              }`}
              style={statusFilter === s ? { background: 'linear-gradient(135deg,#9a78fe,#422266)' } : {}}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-brand-purple/12 shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-brand-purple/8">
              {[
                'Ref / Celebrity', 'User', 'Product', 'Status', 'Price', 'Date',
                ...(canManage ? ['Download', 'Review'] : []),
              ].map(h => (
                <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-content-muted uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-purple/6">
            {loading && (
              <tr>
                <td colSpan={colCount} className="px-5 py-12">
                  <PageLoader />
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={colCount} className="px-5 py-8 text-center text-sm text-content-muted">No jobs found</td></tr>
            )}
            {filtered.map(job => {
              const statusBusy = updatingStatus.has(job.id)
              const downloadBusy = enablingDownload.has(job.id)
              return (
                <tr key={job.id} className="hover:bg-surface-subtle/40 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
                        style={{ background: 'linear-gradient(135deg,#9a78fe,#422266)' }}>
                        {job.celebrity?.initials || '?'}
                      </div>
                      <div>
                        <p className="font-semibold text-content-primary">{job.celebrity?.name || '—'}</p>
                        <p className="text-xs text-content-muted font-mono">{job.reference_id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-content-secondary">{job.user?.name || '—'}</td>
                  <td className="px-5 py-3.5 text-xs text-content-muted capitalize">{job.product_type}</td>
                  <td className="px-5 py-3.5">
                    {canManage ? (
                      <div className="flex items-center gap-1.5">
                        {statusBusy && <Spinner size="sm" className="text-brand-purple" />}
                        <select
                          value={job.status}
                          onChange={e => updateStatus(job.id, e.target.value)}
                          disabled={statusBusy}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full border-0 outline-none transition-opacity ${statusBusy ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${STATUS_COLORS[job.status] || 'bg-surface-subtle text-content-muted'}`}>
                          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    ) : (
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[job.status] || 'bg-surface-subtle text-content-muted'}`}>
                        {job.status}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 font-bold text-brand-purple">${(job.estimated_price || 0).toLocaleString()}</td>
                  <td className="px-5 py-3.5 text-xs text-content-muted">{fmt(job.created_at)}</td>
                  {canManage && (
                    <>
                      <td className="px-5 py-3.5">
                        {job.download_enabled
                          ? <span className="text-xs text-emerald-600 font-semibold">Enabled</span>
                          : <button
                              onClick={() => enableDownload(job.id)}
                              disabled={downloadBusy}
                              className="text-xs font-semibold text-brand-purple hover:underline flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline">
                              {downloadBusy ? <Spinner size="sm" className="text-brand-purple" /> : <Download className="w-3 h-3" />}
                              Enable
                            </button>
                        }
                      </td>
                      <td className="px-5 py-3.5">
                        {job.status === 'review' ? (
                          <button
                            onClick={() => setReviewJob(job)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90"
                            style={{ background: 'linear-gradient(135deg,#f59e0b,#b45309)' }}
                          >
                            <Eye className="w-3 h-3" /> Review
                          </button>
                        ) : (job.preview_url || job.watermarked_url || job.final_video_url) ? (
                          <button
                            onClick={() => setReviewJob(job)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-brand-purple border border-brand-purple/30 hover:bg-brand-purple/8 transition-all"
                          >
                            <Eye className="w-3 h-3" /> View
                          </button>
                        ) : (
                          <span className="text-xs text-content-muted">—</span>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {reviewJob && (
        <ReviewModal
          job={reviewJob}
          onClose={() => setReviewJob(null)}
          onApproved={onApproved}
          onRejected={onRejected}
        />
      )}
    </div>
  )
}
