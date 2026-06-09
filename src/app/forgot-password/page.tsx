'use client'
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Mail, Shield, ArrowLeft, CheckCircle } from 'lucide-react'
import { adminApi } from '@/lib/api'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await adminApi.forgotPassword({ email })
      setSent(true)
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-surface-page relative overflow-hidden">
      <div className="orb w-[520px] h-[520px]"
        style={{ background: 'rgba(154,120,254,0.22)', top: '-120px', right: '-120px' }} />
      <div className="orb orb-delay-4 w-[400px] h-[400px]"
        style={{ background: 'rgba(154,120,254,0.16)', bottom: '-100px', left: '-100px' }} />

      <div className="w-full max-w-md relative z-10">
        <div className="flex justify-center mb-8">
          <Image src="/logo/logo.svg" alt="Twinity" width={120} height={38} />
        </div>

        {sent ? (
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-brand-purple/14 shadow-[0_8px_40px_rgba(154,120,254,0.10)] p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-7 h-7 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-content-primary mb-2">Check your email</h2>
            <p className="text-sm text-content-muted leading-relaxed mb-6">
              If <span className="font-semibold text-content-secondary">{email}</span> is registered, you will receive a password reset link shortly. The link expires in 1 hour.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm font-semibold text-brand-purple hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <p className="text-xs font-bold text-brand-purple uppercase tracking-widest mb-2">Admin panel</p>
              <h2 className="text-2xl font-bold text-content-primary">Forgot your password?</h2>
              <p className="text-sm text-content-muted mt-1.5">
                Enter your admin email address and we will send you a reset link.
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
                      placeholder="admin@twinity.ai"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-brand-purple/20 text-sm outline-none focus:border-brand-purple focus:shadow-[0_0_0_3px_rgba(154,120,254,0.12)] bg-white text-content-primary placeholder:text-content-muted transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-60 mt-1"
                  style={{ background: 'linear-gradient(135deg,#9a78fe,#422266)' }}
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            </div>

            <div className="mt-6 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-sm text-content-muted hover:text-brand-purple transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to sign in
              </Link>
            </div>
          </>
        )}

        <p className="text-center text-xs text-content-muted mt-6 flex items-center justify-center gap-1.5">
          <Shield className="w-3.5 h-3.5 shrink-0" />
          Secured with end-to-end encrypted authentication
        </p>
      </div>
    </div>
  )
}
