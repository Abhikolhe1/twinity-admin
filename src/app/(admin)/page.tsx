'use client'
import { useEffect, useState } from 'react'
import { Users, Film, PhoneCall, DollarSign } from 'lucide-react'
import { adminApi } from '@/lib/api'
import { PageLoader } from '@/components/ui/Spinner'

const STATUS_COLORS: Record<string, string> = {
  delivered:    'bg-emerald-100 text-emerald-700',
  'in-progress':'bg-surface-elevated text-brand-purple',
  review:       'bg-amber-100 text-amber-700',
  pending:      'bg-surface-subtle text-content-muted',
  failed:       'bg-red-100 text-red-700',
  new:          'bg-blue-100 text-blue-700',
  contacted:    'bg-indigo-100 text-indigo-700',
  negotiating:  'bg-amber-100 text-amber-700',
  paid:         'bg-emerald-100 text-emerald-700',
}

function StatCard({ label, value, icon: Icon, sub, gradient }: {
  label: string; value: string | number; icon: React.ElementType; sub?: string; gradient: string
}) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-brand-purple/12 shadow-card flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${gradient}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-content-primary">{value}</p>
        <p className="text-sm text-content-muted mt-0.5">{label}</p>
        {sub && <p className="text-xs text-brand-purple mt-1">{sub}</p>}
      </div>
    </div>
  )
}

const fmt = (d: string) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

export default function DashboardPage() {
  const [stats, setStats] = useState({ totalUsers: 0, totalVideos: 0, totalLeads: 0, totalCelebrities: 0, pendingJobs: 0, activeLeads: 0, totalRevenue: 0 })
  const [recentJobs, setRecentJobs] = useState<any[]>([])
  const [recentLeads, setRecentLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.dashboard().then((res: any) => {
      const d = res.data || {}
      setStats(d.stats || stats)
      setRecentJobs(d.recentJobs || [])
      setRecentLeads(d.recentLeads || [])
    }).catch(() => null).finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-content-primary">Dashboard</h1>
        <p className="text-sm text-content-muted mt-1">Welcome back — here&apos;s what&apos;s happening on Twinity.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Users"    value={stats.totalUsers}    icon={Users}      gradient="bg-gradient-to-br from-blue-400 to-blue-600" />
        <StatCard label="Video Jobs"     value={stats.totalVideos}   icon={Film}       gradient="bg-gradient-to-br from-brand-purple to-brand-dark" sub={`${stats.pendingJobs} pending`} />
        <StatCard label="Active Leads"   value={stats.activeLeads}   icon={PhoneCall}  gradient="bg-gradient-to-br from-amber-400 to-amber-600" sub={`${stats.totalLeads} total`} />
        <StatCard label="Revenue (paid)" value={`$${stats.totalRevenue.toLocaleString()}`} icon={DollarSign} gradient="bg-gradient-to-br from-emerald-400 to-emerald-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Jobs */}
        <div className="bg-white rounded-2xl border border-brand-purple/12 shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-brand-purple/8 flex items-center justify-between">
            <h2 className="font-bold text-content-primary">Recent Video Jobs</h2>
            <a href="/videos" className="text-xs text-brand-purple hover:underline">View all</a>
          </div>
          <div className="divide-y divide-brand-purple/6">
            {loading && (
              <div className="px-6 py-6"><PageLoader /></div>
            )}
            {!loading && recentJobs.length === 0 && (
              <div className="px-6 py-6 text-sm text-content-muted text-center">No jobs yet</div>
            )}
            {recentJobs.map((job: any) => (
              <div key={job.id} className="px-6 py-3.5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
                  style={{ background: 'linear-gradient(135deg,#9a78fe,#422266)' }}>
                  {job.celebrity?.initials || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-content-primary truncate">{job.celebrity?.name || '—'}</p>
                  <p className="text-xs text-content-muted">{job.user?.name || '—'} · {job.reference_id}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[job.status] || 'bg-surface-subtle text-content-muted'}`}>
                    {job.status}
                  </span>
                  <span className="text-xs font-bold text-brand-purple">${(job.estimated_price || 0).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Leads */}
        <div className="bg-white rounded-2xl border border-brand-purple/12 shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-brand-purple/8 flex items-center justify-between">
            <h2 className="font-bold text-content-primary">Recent Leads</h2>
            <a href="/leads" className="text-xs text-brand-purple hover:underline">View all</a>
          </div>
          <div className="divide-y divide-brand-purple/6">
            {loading && (
              <div className="px-6 py-6"><PageLoader /></div>
            )}
            {!loading && recentLeads.length === 0 && (
              <div className="px-6 py-6 text-sm text-content-muted text-center">No leads yet</div>
            )}
            {recentLeads.map((lead: any) => (
              <div key={lead.id} className="px-6 py-3.5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-surface-subtle flex items-center justify-center text-xs font-bold text-brand-purple shrink-0">
                  {lead.name?.charAt(0) || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-content-primary truncate">{lead.name}</p>
                  <p className="text-xs text-content-muted">{lead.email} · {lead.celebrity_name}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[lead.status] || 'bg-surface-subtle text-content-muted'}`}>
                    {lead.status}
                  </span>
                  <span className="text-xs font-bold text-brand-purple">${(lead.estimated_value || 0).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
