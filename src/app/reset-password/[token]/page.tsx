'use client'
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Lock, Eye, EyeOff, Shield, CheckCircle } from 'lucide-react'
import { adminApi, getPortalMode } from '@/lib/api'

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const mode = getPortalMode()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await adminApi.resetPassword(token, { password }, mode)
      setDone(true)
      setTimeout(() => router.replace(mode === 'celebrity' ? '/celebrity-login' : mode === 'manager' ? '/manager-login' : '/login'), 3000)
    } catch (err: any) {
      setError(err.message || 'Invalid or expired reset link.')
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

        {done ? (
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-brand-purple/14 shadow-[0_8px_40px_rgba(154,120,254,0.10)] p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-7 h-7 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-content-primary mb-2">Password reset!</h2>
            <p className="text-sm text-content-muted leading-relaxed">
              Your password has been updated successfully. Redirecting you to sign in...
            </p>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <p className="text-xs font-bold text-brand-purple uppercase tracking-widest mb-2">{mode === 'celebrity' ? 'Celebrity portal' : mode === 'manager' ? 'Manager portal' : 'Admin panel'}</p>
              <h2 className="text-2xl font-bold text-content-primary">Set new password</h2>
              <p className="text-sm text-content-muted mt-1.5">
                Choose a strong password for your {mode === 'celebrity' ? 'celebrity' : mode === 'manager' ? 'manager' : 'admin'} account.
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
                  <label className="text-sm font-semibold text-content-secondary">New password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-content-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      minLength={8}
                      placeholder="Min. 8 characters"
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

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-content-secondary">Confirm password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-content-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      required
                      placeholder="Re-enter password"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-brand-purple/20 text-sm outline-none focus:border-brand-purple focus:shadow-[0_0_0_3px_rgba(154,120,254,0.12)] bg-white text-content-primary placeholder:text-content-muted transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(v => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-content-muted hover:text-content-secondary transition-colors"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-60 mt-1"
                  style={{ background: 'linear-gradient(135deg,#9a78fe,#422266)' }}
                >
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>
            </div>

            <div className="mt-6 text-center">
              <Link
                href={mode === 'celebrity' ? '/celebrity-login' : mode === 'manager' ? '/manager-login' : '/login'}
                className="text-sm text-content-muted hover:text-brand-purple transition-colors"
              >
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
