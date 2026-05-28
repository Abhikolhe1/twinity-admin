'use client'

import { type ReactNode, useEffect, useState } from 'react'
import { adminApi, type CelebrityPortalTemplate } from '@/lib/api'

const AVATAR_COLORS = [
  'linear-gradient(135deg, #9a78fe, #422266)',
  'linear-gradient(135deg, #f59e0b, #b45309)',
  'linear-gradient(135deg, #10b981, #047857)',
  'linear-gradient(135deg, #3b82f6, #1d4ed8)',
  'linear-gradient(135deg, #ef4444, #b91c1c)',
  'linear-gradient(135deg, #ec4899, #9d174d)',
  'linear-gradient(135deg, #8b5cf6, #5b21b6)',
  'linear-gradient(135deg, #06b6d4, #0e7490)',
] as const

const MANAGER_PERMISSION_OPTIONS = [
  { key: 'approve_requests', label: 'Approve requests' },
  { key: 'manage_templates', label: 'Manage template approvals' },
  { key: 'edit_pricing', label: 'Edit pricing' },
  { key: 'view_earnings', label: 'View earnings' },
  { key: 'manage_profile', label: 'Manage profile updates' },
]

type SocialLinks = {
  instagram?: string
  tiktok?: string
  snapchat?: string
  x?: string
  youtube?: string
}

type GeographicAvailability = {
  allowedRegions: string[]
  restrictedRegions: string[]
}

type ToneStylePreferences = {
  communicationStyle: string
  visualStyle: string
  endorsedTopics: string[]
  personalRestrictions: string[]
}

type ApprovalPreferences = {
  greetingAutoApprove: boolean
  manualReviewRequired: boolean
  slaHours: number
  fastTrackEligible: boolean
  templatePolicyReviewed: boolean
}

type ManagerSettings = {
  selfManaged: boolean
  agencyName: string
  managerName: string
  managerEmail: string
  managerPhone: string
  permissions: string[]
}

type ContractAcceptance = {
  accepted: boolean
  acceptedAt: string | null
  signedName: string
}

type Profile = {
  id: string
  name: string
  name_ar: string
  legal_name?: string | null
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
  social_links: SocialLinks
  allowed_content_categories: string[]
  prohibited_industries: string[]
  competitor_brands: string[]
  geographic_availability: GeographicAvailability
  tone_style_preferences: ToneStylePreferences
  approval_preferences: ApprovalPreferences
  preapproved_template_ids: string[]
  manager_settings: ManagerSettings
  approved_media_urls: string[]
  contract_acceptance: ContractAcceptance
}

const DEFAULT_PROFILE: Profile = {
  id: '',
  name: '',
  name_ar: '',
  legal_name: '',
  industry: '',
  nationality: '',
  nationality_ar: '',
  region: '',
  contact_email: '',
  contact_phone: '',
  bio: '',
  bio_ar: '',
  thumbnail_url: '',
  languages: [],
  tags: [],
  tags_ar: [],
  avatar_color: AVATAR_COLORS[0],
  price_range: {
    greeting: { min: 0, max: 0 },
    'video-ad': { min: 0, max: 0 },
  },
  social_links: {},
  allowed_content_categories: [],
  prohibited_industries: [],
  competitor_brands: [],
  geographic_availability: { allowedRegions: [], restrictedRegions: [] },
  tone_style_preferences: {
    communicationStyle: '',
    visualStyle: '',
    endorsedTopics: [],
    personalRestrictions: [],
  },
  approval_preferences: {
    greetingAutoApprove: false,
    manualReviewRequired: true,
    slaHours: 48,
    fastTrackEligible: false,
    templatePolicyReviewed: false,
  },
  preapproved_template_ids: [],
  manager_settings: {
    selfManaged: true,
    agencyName: '',
    managerName: '',
    managerEmail: '',
    managerPhone: '',
    permissions: [],
  },
  approved_media_urls: [],
  contract_acceptance: {
    accepted: false,
    acceptedAt: null,
    signedName: '',
  },
}

function splitCsv(value: string): string[] {
  return value.split(',').map((item) => item.trim()).filter(Boolean)
}

function normalizeProfile(input: any): Profile {
  return {
    ...DEFAULT_PROFILE,
    ...input,
    legal_name: input.legal_name ?? '',
    region: input.region ?? '',
    contact_email: input.contact_email ?? '',
    contact_phone: input.contact_phone ?? '',
    bio: input.bio ?? '',
    bio_ar: input.bio_ar ?? '',
    thumbnail_url: input.thumbnail_url ?? '',
    languages: Array.isArray(input.languages) ? input.languages : [],
    tags: Array.isArray(input.tags) ? input.tags : [],
    tags_ar: Array.isArray(input.tags_ar) ? input.tags_ar : [],
    social_links: input.social_links ?? {},
    allowed_content_categories: Array.isArray(input.allowed_content_categories) ? input.allowed_content_categories : [],
    prohibited_industries: Array.isArray(input.prohibited_industries) ? input.prohibited_industries : [],
    competitor_brands: Array.isArray(input.competitor_brands) ? input.competitor_brands : [],
    geographic_availability: {
      ...DEFAULT_PROFILE.geographic_availability,
      ...(input.geographic_availability ?? {}),
      allowedRegions: Array.isArray(input.geographic_availability?.allowedRegions) ? input.geographic_availability.allowedRegions : [],
      restrictedRegions: Array.isArray(input.geographic_availability?.restrictedRegions) ? input.geographic_availability.restrictedRegions : [],
    },
    tone_style_preferences: {
      ...DEFAULT_PROFILE.tone_style_preferences,
      ...(input.tone_style_preferences ?? {}),
      endorsedTopics: Array.isArray(input.tone_style_preferences?.endorsedTopics) ? input.tone_style_preferences.endorsedTopics : [],
      personalRestrictions: Array.isArray(input.tone_style_preferences?.personalRestrictions) ? input.tone_style_preferences.personalRestrictions : [],
    },
    approval_preferences: {
      ...DEFAULT_PROFILE.approval_preferences,
      ...(input.approval_preferences ?? {}),
    },
    preapproved_template_ids: Array.isArray(input.preapproved_template_ids) ? input.preapproved_template_ids : [],
    manager_settings: {
      ...DEFAULT_PROFILE.manager_settings,
      ...(input.manager_settings ?? {}),
      permissions: Array.isArray(input.manager_settings?.permissions) ? input.manager_settings.permissions : [],
    },
    approved_media_urls: Array.isArray(input.approved_media_urls) ? input.approved_media_urls : [],
    contract_acceptance: {
      ...DEFAULT_PROFILE.contract_acceptance,
      ...(input.contract_acceptance ?? {}),
    },
  }
}

function validateProfile(profile: Profile): string | null {
  if (!profile.name.trim()) return 'Stage name is required.'
  if (!profile.name_ar.trim()) return 'Arabic stage name is required.'
  if (!profile.legal_name?.trim()) return 'Legal name is required.'
  if (!profile.industry.trim()) return 'Industry is required.'
  if (!profile.nationality.trim()) return 'Nationality is required.'
  if (!profile.nationality_ar.trim()) return 'Arabic nationality is required.'
  if (!profile.bio?.trim()) return 'Bio is required.'
  if (!profile.thumbnail_url?.trim()) return 'Profile image URL is required.'
  if (!profile.languages.length) return 'At least one language is required.'
  if (!Object.values(profile.social_links).some(Boolean)) return 'At least one social media link is required.'
  if (!profile.allowed_content_categories.length) return 'Add at least one allowed content category.'
  if (!profile.prohibited_industries.length) return 'Select at least one prohibited industry.'
  if (!profile.competitor_brands.length) return 'Add at least one competitor brand restriction.'
  if (!profile.geographic_availability.allowedRegions.length) return 'Add at least one allowed region.'
  if (!profile.tone_style_preferences.communicationStyle.trim()) return 'Communication style is required.'
  if (!profile.tone_style_preferences.visualStyle.trim()) return 'Visual style is required.'
  if (!profile.tone_style_preferences.endorsedTopics.length) return 'Add at least one endorsed topic.'
  if (!profile.approval_preferences.templatePolicyReviewed) return 'Review the template approval policy before saving.'
  if (!Number.isFinite(Number(profile.approval_preferences.slaHours)) || Number(profile.approval_preferences.slaHours) <= 0) {
    return 'SLA hours must be greater than zero.'
  }
  if (!profile.manager_settings.selfManaged) {
    if (!profile.manager_settings.managerName.trim()) return 'Manager or agent name is required.'
    if (!profile.manager_settings.managerEmail.trim()) return 'Manager or agent email is required.'
    if (!profile.manager_settings.permissions.length) return 'Select at least one manager permission.'
  }
  if (!profile.approved_media_urls.length) return 'Add at least one approved media URL.'
  if (!profile.contract_acceptance.accepted) return 'You must accept the contract terms to complete onboarding.'
  if (!profile.contract_acceptance.signedName.trim()) return 'Signed name is required for contract acceptance.'

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
  const [templates, setTemplates] = useState<CelebrityPortalTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    adminApi.getMyCelebrityProfile()
      .then((res) => {
        setProfile(normalizeProfile(res.data))
        setTemplates(res.templates ?? [])
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  function setField<K extends keyof Profile>(field: K, value: Profile[K]) {
    setProfile((current) => current ? { ...current, [field]: value } : current)
  }

  function toggleStringList(field: 'allowed_content_categories' | 'prohibited_industries' | 'preapproved_template_ids', value: string) {
    setProfile((current) => {
      if (!current) return current
      const currentValues = current[field]
      const nextValues = currentValues.includes(value)
        ? currentValues.filter((item) => item !== value)
        : [...currentValues, value]
      return { ...current, [field]: nextValues }
    })
  }

  function toggleManagerPermission(value: string) {
    setProfile((current) => {
      if (!current) return current
      const permissions = current.manager_settings.permissions.includes(value)
        ? current.manager_settings.permissions.filter((item) => item !== value)
        : [...current.manager_settings.permissions, value]
      return {
        ...current,
        manager_settings: {
          ...current.manager_settings,
          permissions,
        },
      }
    })
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
      const payload = {
        name: profile.name,
        name_ar: profile.name_ar,
        legal_name: profile.legal_name,
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
        social_links: profile.social_links,
        allowed_content_categories: profile.allowed_content_categories,
        prohibited_industries: profile.prohibited_industries,
        competitor_brands: profile.competitor_brands,
        geographic_availability: profile.geographic_availability,
        tone_style_preferences: profile.tone_style_preferences,
        approval_preferences: profile.approval_preferences,
        preapproved_template_ids: profile.preapproved_template_ids,
        manager_settings: profile.manager_settings,
        approved_media_urls: profile.approved_media_urls,
        contract_acceptance: {
          ...profile.contract_acceptance,
          acceptedAt: profile.contract_acceptance.acceptedAt ?? new Date().toISOString(),
        },
      }
      const res: any = await adminApi.saveMyCelebrityProfile(payload)
      setProfile(normalizeProfile(res.data))
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
        <h1 className="mt-2 text-2xl font-bold text-content-primary">Complete your onboarding profile</h1>
        <p className="mt-1 text-sm text-content-muted">
          This extends the approved application into your full working profile, approval settings, restrictions, and contract setup.
        </p>
      </div>

      <form onSubmit={save} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          {error && <Notice tone="error">{error}</Notice>}
          {success && <Notice tone="success">{success}</Notice>}

          <Section title="Identity & Profile" description="Complete your public and legal details, visible bio, and portal pricing.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Stage name *">
                <input value={profile.name} onChange={(e) => setField('name', e.target.value)} className={inputCls} required />
              </Field>
              <Field label="Stage name (Arabic) *">
                <input value={profile.name_ar} onChange={(e) => setField('name_ar', e.target.value)} className={inputCls} dir="rtl" required />
              </Field>
              <Field label="Legal name *">
                <input value={profile.legal_name || ''} onChange={(e) => setField('legal_name', e.target.value)} className={inputCls} required />
              </Field>
              <Field label="Industry *">
                <input value={profile.industry} onChange={(e) => setField('industry', e.target.value)} className={inputCls} required />
              </Field>
              <Field label="Nationality *">
                <input value={profile.nationality} onChange={(e) => setField('nationality', e.target.value)} className={inputCls} required />
              </Field>
              <Field label="Nationality (Arabic) *">
                <input value={profile.nationality_ar} onChange={(e) => setField('nationality_ar', e.target.value)} className={inputCls} dir="rtl" required />
              </Field>
              <Field label="Region">
                <input value={profile.region || ''} onChange={(e) => setField('region', e.target.value)} className={inputCls} />
              </Field>
              <Field label="Phone number">
                <input value={profile.contact_phone || ''} onChange={(e) => setField('contact_phone', e.target.value)} className={inputCls} />
              </Field>
              <Field label="Portal email">
                <input value={profile.contact_email || ''} disabled className={`${inputCls} bg-surface-subtle text-content-muted`} />
              </Field>
              <Field label="Languages (comma separated) *">
                <input
                  value={profile.languages.join(', ')}
                  onChange={(e) => setField('languages', splitCsv(e.target.value))}
                  className={inputCls}
                  required
                />
              </Field>
            </div>

            <div className="mt-4 grid gap-4">
              <Field label="Profile image URL *">
                <input value={profile.thumbnail_url || ''} onChange={(e) => setField('thumbnail_url', e.target.value)} className={inputCls} placeholder="https://..." required />
              </Field>
              <Field label="Avatar Color fallback">
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
              <Field label="Bio *">
                <textarea value={profile.bio || ''} onChange={(e) => setField('bio', e.target.value)} className={textareaCls} rows={4} required />
              </Field>
              <Field label="Bio (Arabic)">
                <textarea value={profile.bio_ar || ''} onChange={(e) => setField('bio_ar', e.target.value)} className={textareaCls} rows={4} dir="rtl" />
              </Field>
              <Field label="English tags (comma separated)">
                <input value={profile.tags.join(', ')} onChange={(e) => setField('tags', splitCsv(e.target.value))} className={inputCls} />
              </Field>
              <Field label="Arabic tags (comma separated)">
                <input value={profile.tags_ar.join(', ')} onChange={(e) => setField('tags_ar', splitCsv(e.target.value))} className={inputCls} dir="rtl" />
              </Field>
            </div>

            <div className="mt-6">
              <p className="mb-3 text-sm font-semibold text-content-secondary">Social links</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Instagram">
                  <input value={profile.social_links.instagram || ''} onChange={(e) => setField('social_links', { ...profile.social_links, instagram: e.target.value })} className={inputCls} />
                </Field>
                <Field label="TikTok">
                  <input value={profile.social_links.tiktok || ''} onChange={(e) => setField('social_links', { ...profile.social_links, tiktok: e.target.value })} className={inputCls} />
                </Field>
                <Field label="Snapchat">
                  <input value={profile.social_links.snapchat || ''} onChange={(e) => setField('social_links', { ...profile.social_links, snapchat: e.target.value })} className={inputCls} />
                </Field>
                <Field label="X">
                  <input value={profile.social_links.x || ''} onChange={(e) => setField('social_links', { ...profile.social_links, x: e.target.value })} className={inputCls} />
                </Field>
                <Field label="YouTube">
                  <input value={profile.social_links.youtube || ''} onChange={(e) => setField('social_links', { ...profile.social_links, youtube: e.target.value })} className={inputCls} />
                </Field>
              </div>
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
          </Section>

          <Section title="Content Categories & Restrictions" description="Define where Twinity can route requests and what should always be blocked.">
            <Field label="Allowed content categories *">
              <input
                value={profile.allowed_content_categories.join(', ')}
                onChange={(e) => setField('allowed_content_categories', splitCsv(e.target.value))}
                className={inputCls}
                placeholder="Fashion, food, tech"
              />
            </Field>
            <div className="mt-4" />
            <Field label="Prohibited industries *">
              <input
                value={profile.prohibited_industries.join(', ')}
                onChange={(e) => setField('prohibited_industries', splitCsv(e.target.value))}
                className={inputCls}
                placeholder="Alcohol, gambling, tobacco"
              />
            </Field>
            <div className="mt-4" />
            <Field label="Competitor brand exclusions *">
              <input
                value={profile.competitor_brands.join(', ')}
                onChange={(e) => setField('competitor_brands', splitCsv(e.target.value))}
                className={inputCls}
                placeholder="Brand A, Brand B"
              />
            </Field>
          </Section>

          <Section title="Geographic Availability" description="Set where your identity may be licensed and which territories should be restricted.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Allowed regions">
                <input
                  value={profile.geographic_availability.allowedRegions.join(', ')}
                  onChange={(e) => setField('geographic_availability', {
                    ...profile.geographic_availability,
                    allowedRegions: splitCsv(e.target.value),
                  })}
                  className={inputCls}
                  placeholder="Saudi Arabia, UAE, Qatar"
                />
              </Field>
              <Field label="Restricted regions">
                <input
                  value={profile.geographic_availability.restrictedRegions.join(', ')}
                  onChange={(e) => setField('geographic_availability', {
                    ...profile.geographic_availability,
                    restrictedRegions: splitCsv(e.target.value),
                  })}
                  className={inputCls}
                  placeholder="Region A, Region B"
                />
              </Field>
            </div>
          </Section>

          <Section title="Tone & Style Preferences" description="Capture the communication style and topics that should guide request review.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Communication style *">
                <input
                  value={profile.tone_style_preferences.communicationStyle}
                  onChange={(e) => setField('tone_style_preferences', { ...profile.tone_style_preferences, communicationStyle: e.target.value })}
                  className={inputCls}
                  placeholder="Formal, casual, premium..."
                />
              </Field>
              <Field label="Visual style *">
                <input
                  value={profile.tone_style_preferences.visualStyle}
                  onChange={(e) => setField('tone_style_preferences', { ...profile.tone_style_preferences, visualStyle: e.target.value })}
                  className={inputCls}
                  placeholder="Editorial, cinematic, clean..."
                />
              </Field>
            </div>
            <div className="mt-4 grid gap-4">
              <Field label="Endorsed topics *">
                <input
                  value={profile.tone_style_preferences.endorsedTopics.join(', ')}
                  onChange={(e) => setField('tone_style_preferences', { ...profile.tone_style_preferences, endorsedTopics: splitCsv(e.target.value) })}
                  className={inputCls}
                  placeholder="Wellness, fashion, travel"
                />
              </Field>
              <Field label="Personal restrictions">
                <textarea
                  value={profile.tone_style_preferences.personalRestrictions.join(', ')}
                  onChange={(e) => setField('tone_style_preferences', { ...profile.tone_style_preferences, personalRestrictions: splitCsv(e.target.value) })}
                  className={textareaCls}
                  rows={3}
                  placeholder="No political endorsements, no competitor mentions..."
                />
              </Field>
            </div>
          </Section>

          <Section title="Approval Preferences & Templates" description="Define approval routing defaults and which commercial templates are pre-approved for fast-track use.">
            <div className="grid gap-4 sm:grid-cols-2">
              <ToggleField
                label="Auto-approve greeting templates"
                checked={profile.approval_preferences.greetingAutoApprove}
                onChange={(checked) => setField('approval_preferences', { ...profile.approval_preferences, greetingAutoApprove: checked })}
              />
              <ToggleField
                label="Manual review required by default"
                checked={profile.approval_preferences.manualReviewRequired}
                onChange={(checked) => setField('approval_preferences', { ...profile.approval_preferences, manualReviewRequired: checked })}
              />
              <ToggleField
                label="Fast-track eligible"
                checked={profile.approval_preferences.fastTrackEligible}
                onChange={(checked) => setField('approval_preferences', { ...profile.approval_preferences, fastTrackEligible: checked })}
              />
              <Field label="SLA hours *">
                <input
                  type="number"
                  min="1"
                  value={profile.approval_preferences.slaHours}
                  onChange={(e) => setField('approval_preferences', { ...profile.approval_preferences, slaHours: Number(e.target.value || 0) })}
                  className={inputCls}
                />
              </Field>
            </div>

            <div className="mt-5 rounded-2xl border border-brand-purple/10 bg-surface-subtle/40 p-4">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={profile.approval_preferences.templatePolicyReviewed}
                  onChange={(e) => setField('approval_preferences', { ...profile.approval_preferences, templatePolicyReviewed: e.target.checked })}
                  className="mt-1 h-4 w-4 rounded border-brand-purple/30"
                />
                <span className="text-sm leading-6 text-content-secondary">
                  I reviewed the fast-track template policy and understand only explicitly selected templates should skip full review.
                </span>
              </label>
            </div>

            <div className="mt-5">
              <p className="mb-3 text-sm font-semibold text-content-secondary">Commercial ad template pre-approval</p>
              {templates.length === 0 ? (
                <p className="text-sm text-content-muted">No active video-ad templates are available right now.</p>
              ) : (
                <div className="grid gap-3">
                  {templates.map((template) => {
                    const selected = profile.preapproved_template_ids.includes(template.id)
                    return (
                      <label key={template.id} className={`rounded-2xl border px-4 py-3 transition-all ${selected ? 'border-brand-purple bg-brand-purple/5' : 'border-brand-purple/12 bg-white'}`}>
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleStringList('preapproved_template_ids', template.id)}
                            className="mt-1 h-4 w-4 rounded border-brand-purple/30"
                          />
                          <div>
                            <p className="text-sm font-semibold text-content-primary">{template.name}</p>
                            <p className="text-xs text-content-muted">{template.purpose} • {template.duration}</p>
                          </div>
                        </div>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          </Section>

          <Section title="Manager / Agent Permissions" description="Record whether you self-manage or delegate actions to an agent, and which actions they may handle.">
            <ToggleField
              label="I manage requests myself"
              checked={profile.manager_settings.selfManaged}
              onChange={(checked) => setField('manager_settings', {
                ...profile.manager_settings,
                selfManaged: checked,
                permissions: checked ? [] : profile.manager_settings.permissions,
              })}
            />

            {!profile.manager_settings.selfManaged && (
              <div className="mt-4 grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Agency name">
                    <input value={profile.manager_settings.agencyName} onChange={(e) => setField('manager_settings', { ...profile.manager_settings, agencyName: e.target.value })} className={inputCls} />
                  </Field>
                  <Field label="Manager / agent name *">
                    <input value={profile.manager_settings.managerName} onChange={(e) => setField('manager_settings', { ...profile.manager_settings, managerName: e.target.value })} className={inputCls} />
                  </Field>
                  <Field label="Manager / agent email *">
                    <input type="email" value={profile.manager_settings.managerEmail} onChange={(e) => setField('manager_settings', { ...profile.manager_settings, managerEmail: e.target.value })} className={inputCls} />
                  </Field>
                  <Field label="Manager / agent phone">
                    <input value={profile.manager_settings.managerPhone} onChange={(e) => setField('manager_settings', { ...profile.manager_settings, managerPhone: e.target.value })} className={inputCls} />
                  </Field>
                </div>
                <Field label="Delegated permissions *">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {MANAGER_PERMISSION_OPTIONS.map((option) => (
                      <label key={option.key} className="flex items-center gap-3 rounded-xl border border-brand-purple/12 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={profile.manager_settings.permissions.includes(option.key)}
                          onChange={() => toggleManagerPermission(option.key)}
                          className="h-4 w-4 rounded border-brand-purple/30"
                        />
                        <span className="text-sm text-content-secondary">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </Field>
              </div>
            )}
          </Section>

          <Section title="Approved Media & Contract" description="Provide the approved asset references Twinity can use and finalize your onboarding acceptance.">
            <Field label="Approved media URLs *">
              <textarea
                value={profile.approved_media_urls.join('\n')}
                onChange={(e) => setField('approved_media_urls', e.target.value.split('\n').map((item) => item.trim()).filter(Boolean))}
                className={textareaCls}
                rows={4}
                placeholder="One URL per line"
              />
            </Field>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Signed name *">
                <input
                  value={profile.contract_acceptance.signedName}
                  onChange={(e) => setField('contract_acceptance', { ...profile.contract_acceptance, signedName: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Acceptance status">
                <input
                  value={profile.contract_acceptance.acceptedAt ? new Date(profile.contract_acceptance.acceptedAt).toLocaleString() : 'Not accepted yet'}
                  disabled
                  className={`${inputCls} bg-surface-subtle text-content-muted`}
                />
              </Field>
            </div>
            <div className="mt-4 rounded-2xl border border-brand-purple/10 bg-surface-subtle/40 p-4">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={profile.contract_acceptance.accepted}
                  onChange={(e) => setField('contract_acceptance', {
                    ...profile.contract_acceptance,
                    accepted: e.target.checked,
                    acceptedAt: e.target.checked ? (profile.contract_acceptance.acceptedAt ?? new Date().toISOString()) : null,
                  })}
                  className="mt-1 h-4 w-4 rounded border-brand-purple/30"
                />
                <span className="text-sm leading-6 text-content-secondary">
                  I accept Twinity platform terms, licensing controls, and the current revenue-share framework for my approved media and request handling.
                </span>
              </label>
            </div>
          </Section>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl px-5 py-3 text-sm font-semibold text-white transition-all disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,#9a78fe,#422266)' }}
            >
              {saving ? 'Saving...' : 'Save onboarding profile'}
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <Section title="Unlock Checklist" description="These sections must be complete before the rest of the portal unlocks.">
            <ChecklistItem done={Boolean(profile.name && profile.name_ar && profile.legal_name)}>Identity details</ChecklistItem>
            <ChecklistItem done={Boolean(profile.bio && profile.thumbnail_url && profile.languages.length)}>Public profile basics</ChecklistItem>
            <ChecklistItem done={Boolean(Object.values(profile.social_links).some(Boolean))}>Social links</ChecklistItem>
            <ChecklistItem done={Boolean(profile.allowed_content_categories.length && profile.prohibited_industries.length && profile.competitor_brands.length)}>Restrictions</ChecklistItem>
            <ChecklistItem done={Boolean(profile.geographic_availability.allowedRegions.length)}>Geography</ChecklistItem>
            <ChecklistItem done={Boolean(profile.tone_style_preferences.communicationStyle && profile.tone_style_preferences.endorsedTopics.length)}>Tone and topics</ChecklistItem>
            <ChecklistItem done={Boolean(profile.approval_preferences.templatePolicyReviewed)}>Approval preferences</ChecklistItem>
            <ChecklistItem done={Boolean(profile.manager_settings.selfManaged || (profile.manager_settings.managerName && profile.manager_settings.managerEmail && profile.manager_settings.permissions.length))}>Manager setup</ChecklistItem>
            <ChecklistItem done={Boolean(profile.approved_media_urls.length)}>Approved media</ChecklistItem>
            <ChecklistItem done={Boolean(profile.contract_acceptance.accepted && profile.contract_acceptance.signedName)}>Contract acceptance</ChecklistItem>
          </Section>

          <Section title="Portal Logic" description="The current flow remains approval-first. This screen is the expanded completion stage after portal access has already been granted.">
            <p className="text-sm leading-6 text-content-muted">
              Once all required sections validate successfully, the profile gate clears automatically and you are redirected to the orders workspace.
            </p>
          </Section>
        </div>
      </form>
    </div>
  )
}

function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <div className="rounded-3xl border border-brand-purple/12 bg-white p-6 shadow-card">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-purple">{title}</p>
      <p className="mt-2 text-sm leading-6 text-content-muted">{description}</p>
      <div className="mt-5">{children}</div>
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

function Notice({ tone, children }: { tone: 'error' | 'success'; children: ReactNode }) {
  const cls = tone === 'error'
    ? 'border-red-200 bg-red-50 text-red-600'
    : 'border-emerald-200 bg-emerald-50 text-emerald-700'
  return <div className={`rounded-2xl border px-4 py-3 text-sm ${cls}`}>{children}</div>
}

function ToggleField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-2xl border border-brand-purple/12 px-4 py-3">
      <span className="text-sm font-medium text-content-secondary">{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 rounded border-brand-purple/30" />
    </label>
  )
}

function ChipGroup({ options, selected, onToggle }: { options: string[]; selected: string[]; onToggle: (value: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = selected.includes(option)
        return (
          <button
            key={option}
            type="button"
            onClick={() => onToggle(option)}
            className={`rounded-full border px-3 py-2 text-sm transition-all ${active ? 'border-brand-purple bg-brand-purple/8 text-brand-purple' : 'border-brand-purple/12 bg-white text-content-secondary'}`}
          >
            {option}
          </button>
        )
      })}
    </div>
  )
}

function ChecklistItem({ done, children }: { done: boolean; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${done ? 'bg-emerald-100 text-emerald-700' : 'bg-surface-subtle text-content-muted'}`}>
        {done ? '✓' : '•'}
      </span>
      <span className={done ? 'text-content-primary' : 'text-content-muted'}>{children}</span>
    </div>
  )
}

const inputCls = 'w-full rounded-2xl border border-brand-purple/20 bg-white px-4 py-3 text-sm text-content-primary outline-none transition-all focus:border-brand-purple'
const textareaCls = `${inputCls} resize-none`
