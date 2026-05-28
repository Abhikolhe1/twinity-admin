'use client'
import { useEffect, useState, useCallback } from 'react'
import { Search, Phone, Mail, DollarSign, Video } from 'lucide-react'
import { adminApi } from '@/lib/api'
import Spinner, { PageLoader } from '@/components/ui/Spinner'
import { usePermissions } from '@/lib/permissions-context'

const STATUS_COLORS: Record<string, string> = {
  new:          'bg-blue-100 text-blue-700',
  contacted:    'bg-indigo-100 text-indigo-700',
  negotiating:  'bg-amber-100 text-amber-700',
  paid:         'bg-emerald-100 text-emerald-700',
  closed:       'bg-surface-subtle text-content-muted',
  lost:         'bg-red-100 text-red-700',
}
const STATUSES = ['new', 'contacted', 'negotiating', 'paid', 'closed', 'lost']

const fmt = (d: string) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [updatingStatus, setUpdatingStatus] = useState<Set<string>>(new Set())
  const permissions = usePermissions()
  const canManage = permissions.includes('leads.manage')

  const fetchLeads = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (statusFilter !== 'all') params.set('status', statusFilter)
    adminApi.leads(params.toString())
      .then((res: any) => {
        setLeads(res.data || [])
        setTotal(res.total || 0)
      })
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [statusFilter])

  useEffect(() => { fetchLeads() }, [fetchLeads])

  const filtered = search
    ? leads.filter(l =>
        l.name?.toLowerCase().includes(search.toLowerCase()) ||
        l.email?.toLowerCase().includes(search.toLowerCase())
      )
    : leads

  const totalValue = filtered.reduce((s: number, l: any) => s + (l.estimated_value || 0), 0)

  async function updateStatus(id: string, status: string) {
    if (updatingStatus.has(id)) return
    setUpdatingStatus(prev => new Set(prev).add(id))
    try {
      await adminApi.updateLead(id, { status })
      setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l))
    } catch {}
    setUpdatingStatus(prev => { const s = new Set(prev); s.delete(id); return s })
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-content-primary">Leads / CRM</h1>
        <p className="text-sm text-content-muted mt-1">
          {total} total · Pipeline value: <span className="text-brand-purple font-bold">${totalValue.toLocaleString()}</span>
        </p>
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative">
          <Search className="w-4 h-4 text-content-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name or email..."
            className="pl-9 pr-4 py-2 rounded-xl border border-brand-purple/20 text-sm outline-none focus:border-brand-purple bg-white text-content-primary placeholder:text-content-muted w-60 transition-colors" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {['all', 'new', 'contacted', 'negotiating', 'paid', 'closed', 'lost'].map(s => (
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
              {['Lead', 'Contact', 'Celebrity / Product', 'Message', 'Video', 'Value', 'Status', 'Source', 'Created'].map(h => (
                <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-content-muted uppercase tracking-wide">{h}</th>
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
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={9} className="px-5 py-8 text-center text-sm text-content-muted">No leads found</td></tr>
            )}
            {filtered.map(lead => {
              const statusBusy = updatingStatus.has(lead.id)
              return (
                <tr key={lead.id} className="hover:bg-surface-subtle/40 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-surface-subtle flex items-center justify-center text-xs font-bold text-brand-purple shrink-0">
                        {lead.name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="font-semibold text-content-primary">{lead.name}</p>
                        <p className="text-xs text-content-muted">{lead.company}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-col gap-1">
                      <a href={`mailto:${lead.email}`} className="flex items-center gap-1 text-xs text-content-secondary hover:text-brand-purple">
                        <Mail className="w-3 h-3" />{lead.email}
                      </a>
                      {lead.phone && (
                        <a href={`tel:${lead.phone}`} className="flex items-center gap-1 text-xs text-content-muted hover:text-brand-purple">
                          <Phone className="w-3 h-3" />{lead.phone}
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-content-primary text-xs">{lead.celebrity_name}</p>
                    <p className="text-xs text-content-muted capitalize">{lead.product_type}</p>
                  </td>
                  <td className="px-5 py-3.5 max-w-[200px]">
                    {lead.notes ? (
                      <p className="text-xs text-content-secondary leading-relaxed line-clamp-3 whitespace-pre-wrap">{lead.notes}</p>
                    ) : (
                      <span className="text-xs text-content-muted">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    {lead.video_job?.reference_id && (
                      <a
                        href={`/videos?search=${lead.video_job.reference_id}`}
                        target='__blank'
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-brand-purple border border-brand-purple/25 hover:bg-brand-purple/8 transition-colors whitespace-nowrap"
                      >
                        <Video className="w-3.5 h-3.5" />
                        View Job
                      </a>
                    )}
                  </td>
                  <td className="px-5 py-3.5 font-bold text-brand-purple">
                    <div className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{(lead.estimated_value || 0).toLocaleString()}</div>
                  </td>
                  <td className="px-5 py-3.5">
                    {canManage ? (
                      <div className="flex items-center gap-1.5">
                        {statusBusy && <Spinner size="sm" className="text-brand-purple" />}
                        <select
                          value={lead.status}
                          onChange={e => updateStatus(lead.id, e.target.value)}
                          disabled={statusBusy}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full border-0 outline-none transition-opacity ${statusBusy ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${STATUS_COLORS[lead.status] || 'bg-surface-subtle text-content-muted'}`}>
                          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    ) : (
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[lead.status] || 'bg-surface-subtle text-content-muted'}`}>
                        {lead.status}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-content-muted capitalize">{lead.source?.replace('-', ' ')}</td>
                  <td className="px-5 py-3.5 text-xs text-content-muted">{fmt(lead.created_at)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
