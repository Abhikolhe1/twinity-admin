'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BarChart3, Eye, EyeOff, Film, Lock, Mail, PhoneCall, Shield, Users } from 'lucide-react'
import { adminApi, getAdminToken, setAdminToken, setPortalMode, type PortalMode } from '@/lib/api'

type LoginModeContent = {
  eyebrow: string
  title: string
  subtitle: string
  stats: { val: string; label: string }[]
  chips: { icon: typeof Users; label: string; color: string }[]
  emailPlaceholder: string
  forgotHref: string
}

const MODE_CONTENT: Record<PortalMode, LoginModeContent> = {
  admin: {
    eyebrow: 'Admin sign in',
    title: 'Manage your platform with full control',
    subtitle: 'Complete visibility into users, videos, celebrities and leads from one secure place.',
    stats: [
      { val: '150+', label: 'Celebrities' },
      { val: '10K+', label: 'Videos Made' },
      { val: '500+', label: 'Brands' },
    ],
    chips: [
      { icon: Users, label: 'User Management', color: 'text-violet-300' },
      { icon: Film, label: 'Video Pipeline', color: 'text-sky-300' },
      { icon: PhoneCall, label: 'CRM & Leads', color: 'text-emerald-300' },
      { icon: BarChart3, label: 'Analytics', color: 'text-amber-300' },
    ],
    emailPlaceholder: 'admin@twinity.ai',
    forgotHref: '/forgot-password',
  },
  celebrity: {
    eyebrow: 'Celebrity portal sign in',
    title: 'Access your celebrity workspace',
    subtitle: 'Sign in to complete your profile, review your work, and manage your Twinity celebrity presence.',
    stats: [
      { val: '1', label: 'Secure Portal' },
      { val: '24/7', label: 'Profile Access' },
      { val: '100%', label: 'Approval Led' },
    ],
    chips: [
      { icon: Users, label: 'My Profile', color: 'text-violet-300' },
      { icon: Film, label: 'My Orders', color: 'text-sky-300' },
      { icon: Shield, label: 'Approved Access', color: 'text-emerald-300' },
    ],
    emailPlaceholder: 'your approved email',
    forgotHref: '/celebrity-forgot-password',
  },
  manager: {
    eyebrow: 'Manager portal sign in',
    title: 'Manage your celebrity roster',
    subtitle: 'Sign in to review requests, track SLA risk, and manage template approvals for your linked celebrities.',
    stats: [
      { val: 'Multi', label: 'Celebrities' },
      { val: 'Live', label: 'Request Queue' },
      { val: '24/7', label: 'SLA Visibility' },
    ],
    chips: [
      { icon: Users, label: 'Portfolio View', color: 'text-violet-300' },
      { icon: Film, label: 'Request Queue', color: 'text-sky-300' },
      { icon: Shield, label: 'Approvals', color: 'text-emerald-300' },
    ],
    emailPlaceholder: 'manager@agency.com',
    forgotHref: '/manager-forgot-password',
  },
}

export default function PortalLoginScreen({ mode }: { mode: PortalMode }) {
  const router = useRouter()
  const content = MODE_CONTENT[mode]
  const defaultEmail = mode === 'admin' ? 'admin@twinity.ai' : ''
  const [email, setEmail] = useState(defaultEmail)
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setPortalMode(mode)
    setEmail(mode === 'admin' ? 'admin@twinity.ai' : '')
    setPassword('')
    setError('')
  }, [mode])

  useEffect(() => {
    if (!getAdminToken(mode)) return
    adminApi.me(mode)
      .then((res: any) => router.replace(mode === 'manager' ? '/manager/dashboard' : res.data?.celebrity_id ? '/celebrity/profile' : '/'))
      .catch(() => {})
  }, [mode, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await adminApi.login({ email, password }, mode) as any
      const resolvedMode: PortalMode = res.manager
        ? 'manager'
        : res.admin?.celebrity_id
          ? 'celebrity'
          : 'admin'
      setAdminToken(res.token, resolvedMode)
      router.push(resolvedMode === 'manager' ? '/manager/dashboard' : resolvedMode === 'celebrity' ? '/celebrity/profile' : '/')
    } catch (err: any) {
      setError(err.message || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <div
        className="hidden lg:flex lg:w-[45%] flex-col items-center justify-center p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #9a78fe 0%, #6B3FA0 50%, #422266 100%)' }}
      >
        <div
          className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #fff, transparent)', transform: 'translate(30%, -30%)' }}
        />
        <div
          className="absolute bottom-0 left-0 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #fff, transparent)', transform: 'translate(-30%, 30%)' }}
        />

        <div className="relative z-10 text-center max-w-md">
          <div className="flex justify-center mb-10">
            <div className="w-20 h-20 rounded-3xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/25 shadow-lg">
              <Image src="/logo/icon-white.png" alt="Twinity" width={20} height={20} className="object-contain" />
            </div>
          </div>

          <Image src="/logo/logo-white.png" alt="Twinity" width={160} height={40} className="mx-auto mb-6 object-contain" />

          <h2 className="text-3xl font-bold text-white leading-tight mb-4">{content.title}</h2>
          <p className="text-white/75 text-base leading-relaxed">{content.subtitle}</p>

          <div className="mt-10 grid grid-cols-3 gap-3">
            {content.stats.map((stat) => (
              <div key={stat.label} className="p-3 rounded-2xl bg-white/12 border border-white/20 backdrop-blur-sm">
                <p className="text-2xl font-bold text-white">{stat.val}</p>
                <p className="text-xs text-white/70 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-2 justify-center">
            {content.chips.map(({ icon: Icon, label, color }) => (
              <span key={label} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-white/12 border border-white/20 text-white/80">
                <Icon className={`w-3 h-3 shrink-0 ${color}`} />
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-surface-page relative overflow-hidden">
        <div
          className="orb w-[520px] h-[520px]"
          style={{ background: 'rgba(154,120,254,0.22)', top: '-120px', right: '-120px' }}
        />
        <div
          className="orb orb-delay-4 w-[400px] h-[400px]"
          style={{ background: 'rgba(154,120,254,0.16)', bottom: '-100px', left: '-100px' }}
        />
        <div
          className="orb orb-delay-2 w-[260px] h-[260px]"
          style={{ background: 'rgba(107,63,160,0.14)', top: '38%', right: '-40px' }}
        />

        <div className="w-full max-w-md relative z-10">
          <div className="flex justify-center mb-8 lg:hidden">
            <div className="flex items-center gap-2.5">
              <Image src="/logo/logo.svg" alt="Twinity" width={100} height={32} />
            </div>
          </div>

          <div className="mb-8">
            <p className="text-xs font-bold text-brand-purple uppercase tracking-widest mb-2">{content.eyebrow}</p>
            <h2 className="text-2xl font-bold text-content-primary">Welcome back</h2>
            <p className="text-sm text-content-muted mt-1.5">
              {mode === 'celebrity'
                ? 'Enter your approved celebrity portal credentials to access your workspace.'
                : mode === 'manager'
                  ? 'Enter your manager credentials to access the Twinity manager portal.'
                  : 'Enter your credentials to access the Twinity admin portal.'}
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-brand-purple/14 shadow-[0_8px_40px_rgba(154,120,254,0.10)] p-7">
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {error && (
                <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-content-secondary">Email address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-content-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder={content.emailPlaceholder}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-brand-purple/20 text-sm outline-none focus:border-brand-purple focus:shadow-[0_0_0_3px_rgba(154,120,254,0.12)] bg-white text-content-primary placeholder:text-content-muted transition-all"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-content-secondary">Password</label>
                  <Link href={content.forgotHref} className="text-xs text-brand-purple hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-content-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-brand-purple/20 text-sm outline-none focus:border-brand-purple focus:shadow-[0_0_0_3px_rgba(154,120,254,0.12)] bg-white text-content-primary placeholder:text-content-muted transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-content-muted hover:text-content-secondary transition-colors"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-60 mt-1"
                style={{ background: 'linear-gradient(135deg,#9a78fe,#422266)' }}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-content-muted mt-6 flex items-center justify-center gap-1.5">
            <Shield className="w-3.5 h-3.5 shrink-0" />
            Secured with end-to-end encrypted authentication
          </p>
        </div>
      </div>
    </div>
  )
}
