'use client'

import { type ReactNode, useEffect, useState } from 'react'
import { adminApi } from '@/lib/api'

const AVATAR_COLORS = [
  'linear-gradient(135deg, #9a78fe, #422266)',
  'linear-gradient(135deg, #f59e0b, #b45309)',
  'linear-gradient(135deg, #10b981, #047857)',
  'linear-gradient(135deg, #3b82f6, #1d4ed8)',
  'linear-gradient(135deg, #ef4444, #b91c1c)',
  'linear-gradient(135deg, #ec4899, #9d174d)',
  'linear-gradient(135deg, #8b5cf6, #5b21b6)',
  'linear-gradient(135deg, #06b6d4, #0e7490)',
]

type Profile = {
  id: string
  name: string
  name_ar: string
  industry: string
  nationality: string
  nationality_ar: string
  region?: string | null
  contact_email?: string | null
  contact_phone?: string | null
  bio?: string | null
  bio_ar?: string | null
  thumbnail_url?: string | null
  languages: string[]
  tags: string[]
  tags_ar: string[]
  avatar_color?: string | null
  price_range?: {
    greeting?: { min?: number; max?: number }
    'video-ad'?: { min?: number; max?: number }
  }
}

function validateProfile(profile: Profile): string | null {
  if (!profile.name.trim()) return 'Full name is required.'
  if (!profile.name_ar.trim()) return 'Arabic name is required.'
  if (!profile.industry.trim()) return 'Industry is required.'
  if (!profile.nationality.trim()) return 'Nationality is required.'
  if (!profile.nationality_ar.trim()) return 'Arabic nationality is required.'
  if (!profile.bio?.trim()) return 'Bio is required.'
  if (!profile.thumbnail_url?.trim()) return 'Profile image URL is required.'
  if (!profile.languages.length) return 'At least one language is required.'
  const greetingMin = Number(profile.price_range?.greeting?.min)
  const greetingMax = Number(profile.price_range?.greeting?.max)
  const videoAdMin = Number(profile.price_range?.['video-ad']?.min)
  const videoAdMax = Number(profile.price_range?.['video-ad']?.max)
  if (!Number.isFinite(greetingMin) || greetingMin < 0) return 'Greeting minimum price is required.'
  if (!Number.isFinite(greetingMax) || greetingMax < 0) return 'Greeting maximum price is required.'
  if (greetingMax < greetingMin) return 'Greeting max price must be greater than or equal to min price.'
  if (!Number.isFinite(videoAdMin) || videoAdMin < 0) return 'Video ad minimum price is required.'
  if (!Number.isFinite(videoAdMax) || videoAdMax < 0) return 'Video ad maximum price is required.'
  if (videoAdMax < videoAdMin) return 'Video ad max price must be greater than or equal to min price.'
  return null
}

export default function CelebrityProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    adminApi.getMyCelebrityProfile()
      .then((res: any) => setProfile(res.data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  function setField<K extends keyof Profile>(field: K, value: Profile[K]) {
    setProfile((current) => current ? { ...current, [field]: value } : current)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    const validationError = validateProfile(profile)
    if (validationError) {
      setError(validationError)
      setSuccess('')
      return
    }
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const res: any = await adminApi.saveMyCelebrityProfile({
        name: profile.name,
        name_ar: profile.name_ar,
        industry: profile.industry,
        nationality: profile.nationality,
        nationality_ar: profile.nationality_ar,
        region: profile.region,
        contact_phone: profile.contact_phone,
        bio: profile.bio,
        bio_ar: profile.bio_ar,
        thumbnail_url: profile.thumbnail_url,
        avatar_color: profile.avatar_color,
        languages: profile.languages,
        tags: profile.tags,
        tags_ar: profile.tags_ar,
        price_range: profile.price_range,
      })
      setProfile(res.data)
      setSuccess('Profile updated successfully.')
      if (res.profileCompleted) {
        window.location.href = '/celebrity/orders'
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="p-8 text-sm text-content-muted">Loading your profile...</div>
  }

  if (!profile) {
    return <div className="p-8 text-sm text-red-500">{error || 'Profile not found.'}</div>
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-purple">Celebrity Portal</p>
        <h1 className="mt-2 text-2xl font-bold text-content-primary">Complete your profile</h1>
        <p className="mt-1 text-sm text-content-muted">
          Finish your public-facing profile details to unlock the rest of the portal.
        </p>
      </div>

      <form onSubmit={save} className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-3xl border border-brand-purple/12 bg-white p-6 shadow-card">
          {error && <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
          {success && <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name *">
              <input value={profile.name} onChange={(e) => setField('name', e.target.value)} className={inputCls} required />
            </Field>
            <Field label="Name (Arabic) *">
              <input value={profile.name_ar} onChange={(e) => setField('name_ar', e.target.value)} className={inputCls} dir="rtl" required />
            </Field>
            <Field label="Industry *">
              <input value={profile.industry} onChange={(e) => setField('industry', e.target.value)} className={inputCls} required />
            </Field>
            <Field label="Region">
              <input value={profile.region || ''} onChange={(e) => setField('region', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Nationality *">
              <input value={profile.nationality} onChange={(e) => setField('nationality', e.target.value)} className={inputCls} required />
            </Field>
            <Field label="Nationality (Arabic) *">
              <input value={profile.nationality_ar} onChange={(e) => setField('nationality_ar', e.target.value)} className={inputCls} dir="rtl" required />
            </Field>
            <Field label="Portal email">
              <input value={profile.contact_email || ''} disabled className={`${inputCls} bg-surface-subtle text-content-muted`} />
            </Field>
            <Field label="Phone number">
              <input value={profile.contact_phone || ''} onChange={(e) => setField('contact_phone', e.target.value)} className={inputCls} />
            </Field>
          </div>

          <div className="mt-4 grid gap-4">
            <Field label="Profile image URL *">
              <input value={profile.thumbnail_url || ''} onChange={(e) => setField('thumbnail_url', e.target.value)} className={inputCls} placeholder="https://..." required />
            </Field>
            <Field label="Avatar Color (fallback when no image)">
              <div className="flex flex-wrap gap-2">
                {AVATAR_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setField('avatar_color', color)}
                    className="h-8 w-8 rounded-xl transition-all"
                    style={{
                      background: color,
                      boxShadow: profile.avatar_color === color ? '0 0 0 3px rgba(154,120,254,0.35)' : 'none',
                    }}
                    aria-label={`Select avatar color ${color}`}
                  />
                ))}
              </div>
            </Field>
            <Field label="Languages (comma separated) *">
              <input
                value={profile.languages.join(', ')}
                onChange={(e) => setField('languages', e.target.value.split(',').map((item) => item.trim()).filter(Boolean))}
                className={inputCls}
                required
              />
            </Field>
            <Field label="English tags (comma separated)">
              <input
                value={profile.tags.join(', ')}
                onChange={(e) => setField('tags', e.target.value.split(',').map((item) => item.trim()).filter(Boolean))}
                className={inputCls}
              />
            </Field>
            <Field label="Arabic tags (comma separated)">
              <input
                value={profile.tags_ar.join(', ')}
                onChange={(e) => setField('tags_ar', e.target.value.split(',').map((item) => item.trim()).filter(Boolean))}
                className={inputCls}
                dir="rtl"
              />
            </Field>
            <Field label="Bio *">
              <textarea value={profile.bio || ''} onChange={(e) => setField('bio', e.target.value)} className={textareaCls} rows={4} required />
            </Field>
            <Field label="Bio (Arabic)">
              <textarea value={profile.bio_ar || ''} onChange={(e) => setField('bio_ar', e.target.value)} className={textareaCls} rows={4} dir="rtl" />
            </Field>
          </div>

          <div className="mt-6">
            <p className="mb-3 text-sm font-semibold text-content-secondary">Pricing (USD)</p>
            <div className="grid gap-4">
              {[
                { label: 'Personal Greetings', key: 'greeting' as const },
                { label: 'Video Ad', key: 'video-ad' as const },
              ].map((row) => (
                <div key={row.key} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <div>
                    <p className="mb-1.5 text-xs text-content-muted">{row.label} - Min</p>
                    <input
                      type="number"
                      min="0"
                      value={profile.price_range?.[row.key]?.min ?? ''}
                      onChange={(e) => setField('price_range', {
                        ...profile.price_range,
                        [row.key]: {
                          min: Number(e.target.value || 0),
                          max: profile.price_range?.[row.key]?.max ?? 0,
                        },
                      })}
                      className={inputCls}
                      required
                    />
                  </div>
                  <span className="mt-5 text-sm text-content-muted">-</span>
                  <div>
                    <p className="mb-1.5 text-xs text-content-muted">{row.label} - Max</p>
                    <input
                      type="number"
                      min="0"
                      value={profile.price_range?.[row.key]?.max ?? ''}
                      onChange={(e) => setField('price_range', {
                        ...profile.price_range,
                        [row.key]: {
                          min: profile.price_range?.[row.key]?.min ?? 0,
                          max: Number(e.target.value || 0),
                        },
                      })}
                      className={inputCls}
                      required
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl px-5 py-3 text-sm font-semibold text-white transition-all disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,#9a78fe,#422266)' }}
            >
              {saving ? 'Saving...' : 'Save profile'}
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-brand-purple/12 bg-white p-6 shadow-card">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-purple">Required to unlock</p>
          <ul className="mt-4 space-y-3 text-sm text-content-secondary">
            <li>Localized name and nationality</li>
            <li>Public bio</li>
            <li>Profile image URL</li>
            <li>Avatar color fallback</li>
            <li>Pricing details</li>
            <li>Industry and language details</li>
          </ul>
          <p className="mt-5 text-sm leading-6 text-content-muted">
            Once the required fields are filled in, the rest of the portal will unlock automatically and you will be redirected to your orders workspace.
          </p>
        </div>
      </form>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-content-secondary">{label}</span>
      {children}
    </label>
  )
}

const inputCls = 'w-full rounded-2xl border border-brand-purple/20 bg-white px-4 py-3 text-sm text-content-primary outline-none transition-all focus:border-brand-purple'
const textareaCls = `${inputCls} resize-none`
