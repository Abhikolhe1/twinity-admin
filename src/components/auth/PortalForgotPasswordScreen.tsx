'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, KeyRound, Mail, Shield, Sparkles } from 'lucide-react'
import { adminApi, setPortalMode, type PortalMode } from '@/lib/api'

const MODE_COPY: Record<PortalMode, { eyebrow: string; title: string; subtitle: string; helper: string[] }> = {
  admin: {
    eyebrow: 'Admin portal',
    title: 'Reset your admin access',
    subtitle: 'Get back into the Twinity admin portal with a secure password reset link sent to your registered admin email.',
    helper: [
      'Email-based recovery only',
      'Secure reset link expires in 1 hour',
      'Best for internal team accounts',
    ],
  },
  celebrity: {
    eyebrow: 'Celebrity portal',
    title: 'Recover your celebrity portal access',
    subtitle: 'Use your approved celebrity portal email address and we will send you a secure reset link to get you back in.',
    helper: [
      'Use the email approved for portal access',
      'Secure reset link expires in 1 hour',
      'Return to profile completion after sign in',
    ],
  },
  manager: {
    eyebrow: 'Manager portal',
    title: 'Recover your manager portal access',
    subtitle: 'Use your manager email address and we will send you a secure reset link so you can get back into your workspace.',
    helper: [
      'Use the manager email assigned by Twinity',
      'Secure reset link expires in 1 hour',
      'Best for external manager accounts',
    ],
  },
}

export default function PortalForgotPasswordScreen({ mode }: { mode: PortalMode }) {
  const isCelebrityMode = mode === 'celebrity'
  const copy = MODE_COPY[mode]
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setPortalMode(mode)
  }, [mode])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await adminApi.forgotPassword({ email }, mode)
      setSent(true)
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const backHref = mode === 'celebrity' ? '/celebrity-login' : mode === 'manager' ? '/manager-login' : '/login'

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <div
        className="hidden lg:flex lg:w-[43%] flex-col items-center justify-center p-12 relative overflow-hidden"
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

        <div className="relative z-10 max-w-md text-center">
          <div className="mx-auto mb-10 flex h-20 w-20 items-center justify-center rounded-3xl border border-white/25 bg-white/15 shadow-lg backdrop-blur-sm">
            <Image src="/logo/icon-white.png" alt="Twinity" width={20} height={20} className="object-contain" />
          </div>

          <Image src="/logo/logo-white.png" alt="Twinity" width={160} height={40} className="mx-auto mb-6 object-contain" />

          <h2 className="text-3xl font-bold leading-tight text-white">{copy.title}</h2>
          <p className="mt-4 text-base leading-relaxed text-white/75">{copy.subtitle}</p>

          <div className="mt-10 grid gap-3">
            {copy.helper.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/20 bg-white/12 px-4 py-4 text-left text-sm text-white/85 backdrop-blur-sm"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-surface-page px-6 py-12">
        <div
          className="orb w-[520px] h-[520px]"
          style={{ background: 'rgba(154,120,254,0.22)', top: '-120px', right: '-120px' }}
        />
        <div
          className="orb orb-delay-4 w-[400px] h-[400px]"
          style={{ background: 'rgba(154,120,254,0.16)', bottom: '-100px', left: '-100px' }}
        />

        <div className="relative z-10 w-full max-w-md">
          <div className="mb-8 flex justify-center lg:hidden">
            <Image src="/logo/logo.svg" alt="Twinity" width={120} height={38} />
          </div>

          {sent ? (
            <div className="rounded-2xl border border-brand-purple/14 bg-white/80 p-8 text-center shadow-[0_8px_40px_rgba(154,120,254,0.10)] backdrop-blur-xl">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50">
                <CheckCircle className="h-7 w-7 text-emerald-500" />
              </div>
              <h2 className="mb-2 text-xl font-bold text-content-primary">Check your email</h2>
              <p className="mb-6 text-sm leading-relaxed text-content-muted">
                If <span className="font-semibold text-content-secondary">{email}</span> is registered, you will receive a password reset link shortly. The link expires in 1 hour.
              </p>
              <Link href={backHref} className="inline-flex items-center gap-2 text-sm font-semibold text-brand-purple hover:underline">
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-brand-purple">{copy.eyebrow}</p>
                <h2 className="text-2xl font-bold text-content-primary">Forgot your password?</h2>
                <p className="mt-1.5 text-sm text-content-muted">
                  {isCelebrityMode
                    ? 'Enter your approved celebrity portal email address and we will send you a reset link.'
                    : mode === 'manager'
                      ? 'Enter your manager portal email address and we will send you a reset link.'
                      : 'Enter your admin email address and we will send you a reset link.'}
                </p>
              </div>

              <div className="rounded-2xl border border-brand-purple/14 bg-white/80 p-7 shadow-[0_8px_40px_rgba(154,120,254,0.10)] backdrop-blur-xl">
                <div className="mb-5 flex items-center gap-3 rounded-2xl border border-[rgba(124,58,237,0.12)] bg-[rgba(124,58,237,0.05)] px-4 py-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-brand-purple">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-content-primary">Secure email recovery</p>
                    <p className="text-xs text-content-muted">We only send reset links to registered portal accounts.</p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                  {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                      {error}
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-content-secondary">Email address</label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-content-muted" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder={mode === 'celebrity' ? 'your approved email' : mode === 'manager' ? 'manager@agency.com' : 'admin@twinity.ai'}
                        className="w-full rounded-xl border border-brand-purple/20 bg-white py-2.5 pl-10 pr-4 text-sm text-content-primary outline-none transition-all placeholder:text-content-muted focus:border-brand-purple focus:shadow-[0_0_0_3px_rgba(154,120,254,0.12)]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-1 w-full rounded-xl py-3 text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg,#9a78fe,#422266)' }}
                  >
                    {loading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </form>
              </div>

              <div className="mt-6 text-center">
                <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm text-content-muted transition-colors hover:text-brand-purple">
                  <ArrowLeft className="h-4 w-4" />
                  Back to sign in
                </Link>
              </div>
            </>
          )}

          <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-content-muted">
            <Shield className="h-3.5 w-3.5 shrink-0" />
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-brand-purple" />
            Secured with end-to-end encrypted authentication
          </p>
        </div>
      </div>
    </div>
  )
}
