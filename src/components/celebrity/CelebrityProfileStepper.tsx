'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react'
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
] as const

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
  is_active?: boolean
  review_notes?: string | null
}

type StepKey =
  | 'identity'
  | 'restrictions'
  | 'geography'
  | 'tone'
  | 'approval'
  | 'manager'
  | 'media'

type CelebrityProfileStepperProps = {
  scope: 'self' | 'admin'
  celebrityId?: string
  readOnly?: boolean
  onClose?: () => void
  onUpdated?: () => void
}

const STEPS: Array<{ key: StepKey; title: string; description: string }> = [
  { key: 'identity', title: 'Identity & Profile', description: 'Public identity, contact details, socials, and pricing.' },
  { key: 'restrictions', title: 'Restrictions', description: 'Content categories, blocked industries, and brand exclusions.' },
  { key: 'geography', title: 'Geography', description: 'Allowed and restricted territories.' },
  { key: 'tone', title: 'Tone & Style', description: 'Communication guidance and endorsed topics.' },
  { key: 'approval', title: 'Approval & Templates', description: 'Review defaults and fast-track template approvals.' },
  { key: 'manager', title: 'Manager / Agent', description: 'Delegated manager details and permissions.' },
  { key: 'media', title: 'Media & Contract', description: 'Approved media and onboarding acceptance.' },
]

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
  is_active: false,
  review_notes: null,
}

function splitCsv(value: string): string[] {
  return value.split(',').map((item) => item.trim()).filter(Boolean)
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function isDigitsOnly(value: string): boolean {
  return /^\d+$/.test(value)
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
    is_active: input.is_active ?? false,
    review_notes: input.review_notes ?? null,
  }
}

function buildStepPayload(step: StepKey, profile: Profile) {
  switch (step) {
    case 'identity':
      return {
        name: profile.name,
        name_ar: profile.name_ar,
        legal_name: profile.legal_name,
        industry: profile.industry,
        nationality: profile.nationality,
        nationality_ar: profile.nationality_ar,
        region: profile.region,
        contact_email: profile.contact_email,
        contact_phone: profile.contact_phone,
        languages: profile.languages,
        bio: profile.bio,
        bio_ar: profile.bio_ar,
        thumbnail_url: profile.thumbnail_url,
        avatar_color: profile.avatar_color,
        tags: profile.tags,
        tags_ar: profile.tags_ar,
        social_links: profile.social_links,
        price_range: profile.price_range,
      }
    case 'restrictions':
      return {
        allowed_content_categories: profile.allowed_content_categories,
        prohibited_industries: profile.prohibited_industries,
        competitor_brands: profile.competitor_brands,
      }
    case 'geography':
      return { geographic_availability: profile.geographic_availability }
    case 'tone':
      return { tone_style_preferences: profile.tone_style_preferences }
    case 'approval':
      return {
        approval_preferences: profile.approval_preferences,
        preapproved_template_ids: profile.preapproved_template_ids,
      }
    case 'manager':
      return { manager_settings: profile.manager_settings }
    case 'media':
      return {
        approved_media_urls: profile.approved_media_urls,
        contract_acceptance: {
          ...profile.contract_acceptance,
          acceptedAt: profile.contract_acceptance.accepted
            ? profile.contract_acceptance.acceptedAt ?? new Date().toISOString()
            : null,
        },
      }
  }
}

function validateStep(step: StepKey, profile: Profile): string | null {
  if (step === 'identity') {
    if (!profile.name.trim()) return 'Stage name is required.'
    if (!profile.name_ar.trim()) return 'Arabic stage name is required.'
    if (!profile.legal_name?.trim()) return 'Legal name is required.'
    if (!profile.industry.trim()) return 'Industry is required.'
    if (!profile.nationality.trim()) return 'Nationality is required.'
    if (!profile.nationality_ar.trim()) return 'Arabic nationality is required.'
    if (profile.contact_email && !isValidEmail(profile.contact_email)) return 'Enter a valid portal email.'
    if (profile.contact_phone && !isDigitsOnly(profile.contact_phone)) return 'Phone number must contain digits only.'
    if (!profile.languages.length) return 'At least one language is required.'
    if (!profile.thumbnail_url?.trim()) return 'Profile image URL is required.'
    if (!profile.bio?.trim()) return 'Bio is required.'
    if (!Object.values(profile.social_links).some(Boolean)) return 'At least one social link is required.'
    const greetingMin = Number(profile.price_range?.greeting?.min)
    const greetingMax = Number(profile.price_range?.greeting?.max)
    const videoMin = Number(profile.price_range?.['video-ad']?.min)
    const videoMax = Number(profile.price_range?.['video-ad']?.max)
    if (!Number.isFinite(greetingMin) || greetingMin < 0) return 'Greeting minimum price is required.'
    if (!Number.isFinite(greetingMax) || greetingMax < greetingMin) return 'Greeting maximum price must be greater than or equal to min price.'
    if (!Number.isFinite(videoMin) || videoMin < 0) return 'Video ad minimum price is required.'
    if (!Number.isFinite(videoMax) || videoMax < videoMin) return 'Video ad maximum price must be greater than or equal to min price.'
  }
  if (step === 'restrictions') {
    if (!profile.allowed_content_categories.length) return 'Add at least one allowed content category.'
    if (!profile.prohibited_industries.length) return 'Add at least one prohibited industry.'
    if (!profile.competitor_brands.length) return 'Add at least one competitor brand.'
  }
  if (step === 'geography') {
    if (!profile.geographic_availability.allowedRegions.length) return 'Add at least one allowed region.'
  }
  if (step === 'tone') {
    if (!profile.tone_style_preferences.communicationStyle.trim()) return 'Communication style is required.'
    if (!profile.tone_style_preferences.visualStyle.trim()) return 'Visual style is required.'
    if (!profile.tone_style_preferences.endorsedTopics.length) return 'Add at least one endorsed topic.'
  }
  if (step === 'approval') {
    if (!Number.isFinite(Number(profile.approval_preferences.slaHours)) || Number(profile.approval_preferences.slaHours) <= 0) {
      return 'SLA hours must be greater than zero.'
    }
    if (!profile.approval_preferences.templatePolicyReviewed) return 'Review the template policy before saving this section.'
  }
  if (step === 'manager') {
    if (!profile.manager_settings.selfManaged) {
      if (!profile.manager_settings.managerName.trim()) return 'Manager or agent name is required.'
      if (!profile.manager_settings.managerEmail.trim()) return 'Manager or agent email is required.'
      if (!isValidEmail(profile.manager_settings.managerEmail)) return 'Enter a valid manager email.'
      if (profile.manager_settings.managerPhone && !isDigitsOnly(profile.manager_settings.managerPhone)) return 'Manager phone must contain digits only.'
      if (!profile.manager_settings.permissions.length) return 'Select at least one delegated permission.'
    }
  }
  if (step === 'media') {
    if (!profile.approved_media_urls.length) return 'Add at least one approved media URL.'
    if (!profile.contract_acceptance.accepted) return 'Contract acceptance is required.'
    if (!profile.contract_acceptance.signedName.trim()) return 'Signed name is required.'
  }
  return null
}

export default function CelebrityProfileStepper({
  scope,
  celebrityId,
  readOnly = false,
  onClose,
  onUpdated,
}: CelebrityProfileStepperProps) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [templates, setTemplates] = useState<CelebrityPortalTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [stepIndex, setStepIndex] = useState(0)
  const [reviewNote, setReviewNote] = useState('')
  const [draftFields, setDraftFields] = useState<Record<string, string>>({})

  const step = STEPS[stepIndex]

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      try {
        const res = scope === 'self'
          ? await adminApi.getMyCelebrityProfile()
          : await adminApi.getCelebrityProfileByAdmin(celebrityId!)
        if (cancelled) return
        setProfile(normalizeProfile(res.data))
        setTemplates(res.templates ?? [])
        setReviewNote(String((res.data as any).review_notes || ''))
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Failed to load profile')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    if (scope === 'admin' && !celebrityId) return
    load()
    return () => { cancelled = true }
  }, [scope, celebrityId])

  const checklist = useMemo(() => {
    if (!profile) return []
    return [
      Boolean(profile.name && profile.name_ar && profile.legal_name),
      Boolean(profile.bio && profile.thumbnail_url && profile.languages.length),
      Boolean(profile.allowed_content_categories.length && profile.prohibited_industries.length && profile.competitor_brands.length),
      Boolean(profile.geographic_availability.allowedRegions.length),
      Boolean(profile.tone_style_preferences.communicationStyle && profile.tone_style_preferences.endorsedTopics.length),
      Boolean(profile.approval_preferences.templatePolicyReviewed),
      Boolean(profile.manager_settings.selfManaged || (profile.manager_settings.managerName && profile.manager_settings.managerEmail && profile.manager_settings.permissions.length)),
      Boolean(profile.approved_media_urls.length && profile.contract_acceptance.accepted && profile.contract_acceptance.signedName),
    ]
  }, [profile])

  const highestUnlockedStep = useMemo(() => {
    if (!profile) return 0
    let unlocked = 0
    for (let index = 0; index < STEPS.length; index += 1) {
      const validationError = validateStep(STEPS[index].key, profile)
      if (validationError) break
      unlocked = index + 1
    }
    return Math.min(unlocked, STEPS.length - 1)
  }, [profile])

  function setField<K extends keyof Profile>(field: K, value: Profile[K]) {
    setProfile((current) => current ? { ...current, [field]: value } : current)
  }

  function setDraftField(key: string, value: string, apply: () => void) {
    setDraftFields((current) => ({ ...current, [key]: value }))
    apply()
  }

  function getDraftValue(key: string, fallback: string) {
    return draftFields[key] ?? fallback
  }

  function toggleTemplate(templateId: string) {
    setProfile((current) => {
      if (!current) return current
      const selected = current.preapproved_template_ids.includes(templateId)
      return {
        ...current,
        preapproved_template_ids: selected
          ? current.preapproved_template_ids.filter((item) => item !== templateId)
          : [...current.preapproved_template_ids, templateId],
      }
    })
  }

  function toggleManagerPermission(permission: string) {
    setProfile((current) => {
      if (!current) return current
      const selected = current.manager_settings.permissions.includes(permission)
      return {
        ...current,
        manager_settings: {
          ...current.manager_settings,
          permissions: selected
            ? current.manager_settings.permissions.filter((item) => item !== permission)
            : [...current.manager_settings.permissions, permission],
        },
      }
    })
  }

  async function saveSection(goNext = false) {
    if (!profile || readOnly) return
    const validationError = validateStep(step.key, profile)
    if (validationError) {
      setError(validationError)
      setSuccess('')
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const payload = buildStepPayload(step.key, profile)
      const res: any = scope === 'self'
        ? await adminApi.saveMyCelebrityProfile(payload)
        : await adminApi.saveCelebrityProfileByAdmin(celebrityId!, payload)
      setProfile(normalizeProfile(res.data))
      setDraftFields({})
      setSuccess(`${step.title} saved.`)
      onUpdated?.()
      if (goNext && stepIndex < STEPS.length - 1) setStepIndex((current) => current + 1)
    } catch (err: any) {
      setError(err.message || 'Failed to save section')
    } finally {
      setSaving(false)
    }
  }

  async function submitForReview() {
    if (!profile) return
    const validationError = validateStep('media', profile)
    if (validationError) {
      setError(validationError)
      return
    }
    setSubmitting(true)
    setError('')
    setSuccess('')
    try {
      await adminApi.submitMyCelebrityProfile()
      setSuccess('Profile submitted for superadmin review.')
      onUpdated?.()
      if (typeof window !== 'undefined') {
        window.setTimeout(() => {
          window.location.reload()
        }, 500)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit profile for review')
    } finally {
      setSubmitting(false)
    }
  }

  async function activateProfile() {
    if (!celebrityId) return
    setSubmitting(true)
    setError('')
    setSuccess('')
    try {
      await adminApi.activateCelebrityProfile(celebrityId)
      setSuccess('Celebrity activated for full portal access.')
      onUpdated?.()
    } catch (err: any) {
      setError(err.message || 'Failed to activate celebrity')
    } finally {
      setSubmitting(false)
    }
  }

  async function requestChanges() {
    if (!celebrityId) return
    if (!reviewNote.trim()) {
      setError('Add a review note before requesting changes.')
      return
    }
    setSubmitting(true)
    setError('')
    setSuccess('')
    try {
      await adminApi.requestCelebrityProfileChanges(celebrityId, reviewNote.trim())
      setSuccess('Changes requested from celebrity.')
      onUpdated?.()
    } catch (err: any) {
      setError(err.message || 'Failed to request changes')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="p-8 text-sm text-content-muted">Loading profile...</div>
  }

  if (!profile) {
    return <div className="p-8 text-sm text-red-500">{error || 'Profile not found.'}</div>
  }

  const shellClass = onClose
    ? 'flex h-full flex-col bg-white'
    : 'p-4 sm:p-8'

  return (
    <div className={shellClass}>
      <div className={onClose ? 'flex items-center justify-between border-b border-brand-purple/10 px-6 py-4' : 'mb-6'}>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-purple">
            {scope === 'self' ? 'Celebrity Portal' : readOnly ? 'Superadmin View' : 'Superadmin Edit'}
          </p>
          <h1 className="mt-2 text-2xl font-bold text-content-primary">
            {scope === 'self' ? 'Complete your onboarding profile' : readOnly ? 'Celebrity profile details' : 'Review celebrity profile'}
          </h1>
          <p className="mt-1 text-sm text-content-muted">
            {scope === 'self'
              ? 'Save each section as you go, then submit the completed profile for review.'
              : 'Use the same profile stepper to review, edit, and activate approved celebrities.'}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-content-muted transition-all hover:bg-surface-subtle hover:text-content-primary"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className={onClose ? 'flex min-h-0 flex-1 flex-col lg:flex-row' : 'grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)_320px]'}>
        <div className={onClose ? 'border-b border-brand-purple/10 px-6 py-5 lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r' : ''}>
          <div className="space-y-2">
            {STEPS.map((item, index) => {
              const active = index === stepIndex
              const done = index < checklist.length ? checklist[index] : false
              const disabled = scope === 'self' && index > stepIndex && index > highestUnlockedStep
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    if (!disabled) setStepIndex(index)
                  }}
                  disabled={disabled}
                  className={[
                    'flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-all',
                    active
                      ? 'border-brand-purple bg-brand-purple/6'
                      : 'border-brand-purple/12 bg-white hover:border-brand-purple/24 hover:bg-surface-subtle/40',
                    disabled ? 'cursor-not-allowed opacity-50 hover:border-brand-purple/12 hover:bg-white' : '',
                  ].join(' ')}
                >
                  <span className={[
                    'mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                    done ? 'bg-emerald-100 text-emerald-700' : active ? 'bg-brand-purple text-white' : 'bg-surface-subtle text-content-muted',
                  ].join(' ')}>
                    {done ? '✓' : index + 1}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-content-primary">{item.title}</span>
                    <span className="mt-1 block text-xs leading-5 text-content-muted">{item.description}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className={onClose ? 'min-h-0 flex-1 overflow-y-auto px-6 py-6' : ''}>
          {error && <Notice tone="error">{error}</Notice>}
          {success && <Notice tone="success">{success}</Notice>}
          {profile.review_notes && (
            <Notice tone="warning">{profile.review_notes}</Notice>
          )}

          <Section title={step.title} description={step.description}>
            {step.key === 'identity' && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Stage name *"><input value={profile.name} onChange={(e) => setField('name', e.target.value)} className={inputCls} disabled={readOnly} /></Field>
                  <Field label="Stage name (Arabic) *"><input value={profile.name_ar} onChange={(e) => setField('name_ar', e.target.value)} className={inputCls} dir="rtl" disabled={readOnly} /></Field>
                  <Field label="Legal name *"><input value={profile.legal_name || ''} onChange={(e) => setField('legal_name', e.target.value)} className={inputCls} disabled={readOnly} /></Field>
                  <Field label="Industry *"><input value={profile.industry} onChange={(e) => setField('industry', e.target.value)} className={inputCls} disabled={readOnly} /></Field>
                  <Field label="Nationality *"><input value={profile.nationality} onChange={(e) => setField('nationality', e.target.value)} className={inputCls} disabled={readOnly} /></Field>
                  <Field label="Nationality (Arabic) *"><input value={profile.nationality_ar} onChange={(e) => setField('nationality_ar', e.target.value)} className={inputCls} dir="rtl" disabled={readOnly} /></Field>
                  <Field label="Region"><input value={profile.region || ''} onChange={(e) => setField('region', e.target.value)} className={inputCls} disabled={readOnly} /></Field>
                  <Field label="Phone number"><input value={profile.contact_phone || ''} onChange={(e) => setField('contact_phone', e.target.value)} inputMode="numeric" className={inputCls} disabled={readOnly} /></Field>
                  <Field label="Portal email">
                    <input
                      value={profile.contact_email || ''}
                      onChange={(e) => setField('contact_email', e.target.value)}
                      disabled={readOnly || scope === 'self'}
                      className={`${inputCls} ${(readOnly || scope === 'self') ? 'bg-surface-subtle text-content-muted' : ''}`}
                    />
                  </Field>
                  <Field label="Languages (comma separated) *"><input value={getDraftValue('languages', profile.languages.join(', '))} onChange={(e) => setDraftField('languages', e.target.value, () => setField('languages', splitCsv(e.target.value)))} className={inputCls} disabled={readOnly} /></Field>
                </div>

                <div className="mt-4 grid gap-4">
                  <Field label="Profile image URL *"><input value={profile.thumbnail_url || ''} onChange={(e) => setField('thumbnail_url', e.target.value)} className={inputCls} disabled={readOnly} /></Field>
                  <Field label="Avatar color fallback">
                    <div className="flex flex-wrap gap-2">
                      {AVATAR_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => !readOnly && setField('avatar_color', color)}
                          disabled={readOnly}
                          className="h-8 w-8 rounded-xl transition-all disabled:cursor-default"
                          style={{ background: color, boxShadow: profile.avatar_color === color ? '0 0 0 3px rgba(154,120,254,0.35)' : 'none' }}
                        />
                      ))}
                    </div>
                  </Field>
                  <Field label="Bio *"><textarea value={profile.bio || ''} onChange={(e) => setField('bio', e.target.value)} className={textareaCls} rows={4} disabled={readOnly} /></Field>
                  <Field label="Bio (Arabic)"><textarea value={profile.bio_ar || ''} onChange={(e) => setField('bio_ar', e.target.value)} className={textareaCls} rows={4} dir="rtl" disabled={readOnly} /></Field>
                  <Field label="English tags (comma separated)"><input value={getDraftValue('tags', profile.tags.join(', '))} onChange={(e) => setDraftField('tags', e.target.value, () => setField('tags', splitCsv(e.target.value)))} className={inputCls} disabled={readOnly} /></Field>
                  <Field label="Arabic tags (comma separated)"><input value={getDraftValue('tags_ar', profile.tags_ar.join(', '))} onChange={(e) => setDraftField('tags_ar', e.target.value, () => setField('tags_ar', splitCsv(e.target.value)))} className={inputCls} dir="rtl" disabled={readOnly} /></Field>
                </div>

                <div className="mt-6">
                  <p className="mb-3 text-sm font-semibold text-content-secondary">Social links</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Instagram"><input value={profile.social_links.instagram || ''} onChange={(e) => setField('social_links', { ...profile.social_links, instagram: e.target.value })} className={inputCls} disabled={readOnly} /></Field>
                    <Field label="TikTok"><input value={profile.social_links.tiktok || ''} onChange={(e) => setField('social_links', { ...profile.social_links, tiktok: e.target.value })} className={inputCls} disabled={readOnly} /></Field>
                    <Field label="Snapchat"><input value={profile.social_links.snapchat || ''} onChange={(e) => setField('social_links', { ...profile.social_links, snapchat: e.target.value })} className={inputCls} disabled={readOnly} /></Field>
                    <Field label="X"><input value={profile.social_links.x || ''} onChange={(e) => setField('social_links', { ...profile.social_links, x: e.target.value })} className={inputCls} disabled={readOnly} /></Field>
                    <Field label="YouTube"><input value={profile.social_links.youtube || ''} onChange={(e) => setField('social_links', { ...profile.social_links, youtube: e.target.value })} className={inputCls} disabled={readOnly} /></Field>
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
                            onChange={(e) => setField('price_range', { ...profile.price_range, [row.key]: { min: Number(e.target.value || 0), max: profile.price_range?.[row.key]?.max ?? 0 } })}
                            className={inputCls}
                            disabled={readOnly}
                          />
                        </div>
                        <span className="mt-5 text-sm text-content-muted">-</span>
                        <div>
                          <p className="mb-1.5 text-xs text-content-muted">{row.label} - Max</p>
                          <input
                            type="number"
                            min="0"
                            value={profile.price_range?.[row.key]?.max ?? ''}
                            onChange={(e) => setField('price_range', { ...profile.price_range, [row.key]: { min: profile.price_range?.[row.key]?.min ?? 0, max: Number(e.target.value || 0) } })}
                            className={inputCls}
                            disabled={readOnly}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {step.key === 'restrictions' && (
              <>
                <Field label="Allowed content categories *"><input value={getDraftValue('allowed_content_categories', profile.allowed_content_categories.join(', '))} onChange={(e) => setDraftField('allowed_content_categories', e.target.value, () => setField('allowed_content_categories', splitCsv(e.target.value)))} className={inputCls} disabled={readOnly} /></Field>
                <div className="mt-4" />
                <Field label="Prohibited industries *"><input value={getDraftValue('prohibited_industries', profile.prohibited_industries.join(', '))} onChange={(e) => setDraftField('prohibited_industries', e.target.value, () => setField('prohibited_industries', splitCsv(e.target.value)))} className={inputCls} disabled={readOnly} /></Field>
                <div className="mt-4" />
                <Field label="Competitor brand exclusions *"><input value={getDraftValue('competitor_brands', profile.competitor_brands.join(', '))} onChange={(e) => setDraftField('competitor_brands', e.target.value, () => setField('competitor_brands', splitCsv(e.target.value)))} className={inputCls} disabled={readOnly} /></Field>
              </>
            )}

            {step.key === 'geography' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Allowed regions"><input value={getDraftValue('allowed_regions', profile.geographic_availability.allowedRegions.join(', '))} onChange={(e) => setDraftField('allowed_regions', e.target.value, () => setField('geographic_availability', { ...profile.geographic_availability, allowedRegions: splitCsv(e.target.value) }))} className={inputCls} disabled={readOnly} /></Field>
                <Field label="Restricted regions"><input value={getDraftValue('restricted_regions', profile.geographic_availability.restrictedRegions.join(', '))} onChange={(e) => setDraftField('restricted_regions', e.target.value, () => setField('geographic_availability', { ...profile.geographic_availability, restrictedRegions: splitCsv(e.target.value) }))} className={inputCls} disabled={readOnly} /></Field>
              </div>
            )}

            {step.key === 'tone' && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Communication style *"><input value={profile.tone_style_preferences.communicationStyle} onChange={(e) => setField('tone_style_preferences', { ...profile.tone_style_preferences, communicationStyle: e.target.value })} className={inputCls} disabled={readOnly} /></Field>
                  <Field label="Visual style *"><input value={profile.tone_style_preferences.visualStyle} onChange={(e) => setField('tone_style_preferences', { ...profile.tone_style_preferences, visualStyle: e.target.value })} className={inputCls} disabled={readOnly} /></Field>
                </div>
                <div className="mt-4 grid gap-4">
                  <Field label="Endorsed topics *"><input value={getDraftValue('endorsed_topics', profile.tone_style_preferences.endorsedTopics.join(', '))} onChange={(e) => setDraftField('endorsed_topics', e.target.value, () => setField('tone_style_preferences', { ...profile.tone_style_preferences, endorsedTopics: splitCsv(e.target.value) }))} className={inputCls} disabled={readOnly} /></Field>
                  <Field label="Personal restrictions"><textarea value={getDraftValue('personal_restrictions', profile.tone_style_preferences.personalRestrictions.join(', '))} onChange={(e) => setDraftField('personal_restrictions', e.target.value, () => setField('tone_style_preferences', { ...profile.tone_style_preferences, personalRestrictions: splitCsv(e.target.value) }))} className={textareaCls} rows={3} disabled={readOnly} /></Field>
                </div>
              </>
            )}

            {step.key === 'approval' && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <ToggleField label="Auto-approve greeting templates" checked={profile.approval_preferences.greetingAutoApprove} onChange={(checked) => setField('approval_preferences', { ...profile.approval_preferences, greetingAutoApprove: checked })} disabled={readOnly} />
                  <ToggleField label="Manual review required by default" checked={profile.approval_preferences.manualReviewRequired} onChange={(checked) => setField('approval_preferences', { ...profile.approval_preferences, manualReviewRequired: checked })} disabled={readOnly} />
                  <ToggleField label="Fast-track eligible" checked={profile.approval_preferences.fastTrackEligible} onChange={(checked) => setField('approval_preferences', { ...profile.approval_preferences, fastTrackEligible: checked })} disabled={readOnly} />
                  <Field label="SLA hours *"><input type="number" min="1" value={profile.approval_preferences.slaHours} onChange={(e) => setField('approval_preferences', { ...profile.approval_preferences, slaHours: Number(e.target.value || 0) })} className={inputCls} disabled={readOnly} /></Field>
                </div>
                <div className="mt-5 rounded-2xl border border-brand-purple/10 bg-surface-subtle/40 p-4">
                  <label className="flex items-start gap-3">
                    <input type="checkbox" checked={profile.approval_preferences.templatePolicyReviewed} onChange={(e) => setField('approval_preferences', { ...profile.approval_preferences, templatePolicyReviewed: e.target.checked })} className="mt-1 h-4 w-4 rounded border-brand-purple/30" disabled={readOnly} />
                    <span className="text-sm leading-6 text-content-secondary">I reviewed the fast-track template policy and understand only explicitly selected templates should skip full review.</span>
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
                              <input type="checkbox" checked={selected} onChange={() => toggleTemplate(template.id)} className="mt-1 h-4 w-4 rounded border-brand-purple/30" disabled={readOnly} />
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
              </>
            )}

            {step.key === 'manager' && (
              <>
                <ToggleField
                  label="I manage requests myself"
                  checked={profile.manager_settings.selfManaged}
                  onChange={(checked) => setField('manager_settings', { ...profile.manager_settings, selfManaged: checked, permissions: checked ? [] : profile.manager_settings.permissions })}
                  disabled={readOnly}
                />
                {!profile.manager_settings.selfManaged && (
                  <div className="mt-4 grid gap-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Agency name"><input value={profile.manager_settings.agencyName} onChange={(e) => setField('manager_settings', { ...profile.manager_settings, agencyName: e.target.value })} className={inputCls} disabled={readOnly} /></Field>
                      <Field label="Manager / agent name *"><input value={profile.manager_settings.managerName} onChange={(e) => setField('manager_settings', { ...profile.manager_settings, managerName: e.target.value })} className={inputCls} disabled={readOnly} /></Field>
                      <Field label="Manager / agent email *"><input value={profile.manager_settings.managerEmail} onChange={(e) => setField('manager_settings', { ...profile.manager_settings, managerEmail: e.target.value })} className={inputCls} disabled={readOnly} /></Field>
                      <Field label="Manager / agent phone"><input value={profile.manager_settings.managerPhone} onChange={(e) => setField('manager_settings', { ...profile.manager_settings, managerPhone: e.target.value })} inputMode="numeric" className={inputCls} disabled={readOnly} /></Field>
                    </div>
                    <Field label="Delegated permissions *">
                      <div className="grid gap-2 sm:grid-cols-2">
                        {MANAGER_PERMISSION_OPTIONS.map((option) => (
                          <label key={option.key} className="flex items-center gap-3 rounded-xl border border-brand-purple/12 px-4 py-3">
                            <input type="checkbox" checked={profile.manager_settings.permissions.includes(option.key)} onChange={() => toggleManagerPermission(option.key)} className="h-4 w-4 rounded border-brand-purple/30" disabled={readOnly} />
                            <span className="text-sm text-content-secondary">{option.label}</span>
                          </label>
                        ))}
                      </div>
                    </Field>
                  </div>
                )}
              </>
            )}

            {step.key === 'media' && (
              <>
                <Field label="Approved media URLs *">
                  <textarea value={profile.approved_media_urls.join('\n')} onChange={(e) => setField('approved_media_urls', e.target.value.split('\n').map((item) => item.trim()).filter(Boolean))} className={textareaCls} rows={5} disabled={readOnly} />
                </Field>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="Signed name *"><input value={profile.contract_acceptance.signedName} onChange={(e) => setField('contract_acceptance', { ...profile.contract_acceptance, signedName: e.target.value })} className={inputCls} disabled={readOnly} /></Field>
                  <Field label="Acceptance status"><input value={profile.contract_acceptance.acceptedAt ? new Date(profile.contract_acceptance.acceptedAt).toLocaleString() : 'Not accepted yet'} disabled className={`${inputCls} bg-surface-subtle text-content-muted`} /></Field>
                </div>
                <div className="mt-4 rounded-2xl border border-brand-purple/10 bg-surface-subtle/40 p-4">
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={profile.contract_acceptance.accepted}
                      onChange={(e) => setField('contract_acceptance', { ...profile.contract_acceptance, accepted: e.target.checked, acceptedAt: e.target.checked ? (profile.contract_acceptance.acceptedAt ?? new Date().toISOString()) : null })}
                      className="mt-1 h-4 w-4 rounded border-brand-purple/30"
                      disabled={readOnly}
                    />
                    <span className="text-sm leading-6 text-content-secondary">I accept Twinity platform terms, licensing controls, and the current revenue-share framework for my approved media and request handling.</span>
                  </label>
                </div>
                {scope === 'admin' && !readOnly && (
                  <div className="mt-5">
                    <Field label="Review note for celebrity">
                      <textarea value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} className={textareaCls} rows={3} placeholder="Explain what needs to change if you are sending the profile back." />
                    </Field>
                  </div>
                )}
              </>
            )}
          </Section>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setStepIndex((current) => Math.max(0, current - 1))} disabled={stepIndex === 0} className="inline-flex items-center gap-2 rounded-xl border border-brand-purple/20 px-4 py-2.5 text-sm font-medium text-content-secondary transition-all hover:bg-surface-subtle disabled:cursor-not-allowed disabled:opacity-50">
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
              <button type="button" onClick={() => setStepIndex((current) => Math.min(STEPS.length - 1, current + 1))} disabled={stepIndex === STEPS.length - 1 || (scope === 'self' && Boolean(validateStep(step.key, profile)))} className="inline-flex items-center gap-2 rounded-xl border border-brand-purple/20 px-4 py-2.5 text-sm font-medium text-content-secondary transition-all hover:bg-surface-subtle disabled:cursor-not-allowed disabled:opacity-50">
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {!readOnly && (
              <div className="flex flex-wrap items-center gap-3">
                {stepIndex < STEPS.length - 1 && (
                  <button type="button" onClick={() => saveSection(true)} disabled={saving} className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-60" style={{ background: 'linear-gradient(135deg,#9a78fe,#422266)' }}>
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save & Continue
                  </button>
                )}
                {scope === 'self' && stepIndex === STEPS.length - 1 && (
                  <button type="button" onClick={submitForReview} disabled={submitting} className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-60" style={{ background: 'linear-gradient(135deg,#9a78fe,#422266)' }}>
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Submit for Review
                  </button>
                )}
                {scope === 'admin' && stepIndex === STEPS.length - 1 && (
                  <>
                    <button type="button" onClick={requestChanges} disabled={submitting} className="inline-flex items-center gap-2 rounded-xl border border-amber-200 px-4 py-2.5 text-sm font-medium text-amber-700 transition-all hover:bg-amber-50 disabled:opacity-60">
                      {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                      Request Changes
                    </button>
                    <button type="button" onClick={activateProfile} disabled={submitting} className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-60" style={{ background: 'linear-gradient(135deg,#9a78fe,#422266)' }}>
                      {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                      Activate Celebrity
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {!onClose && (
          <div className="space-y-6">
            <Section title="Unlock Checklist" description="These sections must be complete before the rest of the portal unlocks.">
              <ChecklistItem done={checklist[0]}>Identity details</ChecklistItem>
              <ChecklistItem done={checklist[1]}>Public profile basics</ChecklistItem>
              <ChecklistItem done={checklist[2]}>Restrictions</ChecklistItem>
              <ChecklistItem done={checklist[3]}>Geography</ChecklistItem>
              <ChecklistItem done={checklist[4]}>Tone and topics</ChecklistItem>
              <ChecklistItem done={checklist[5]}>Approval preferences</ChecklistItem>
              <ChecklistItem done={checklist[6]}>Manager setup</ChecklistItem>
              <ChecklistItem done={checklist[7]}>Media and contract</ChecklistItem>
            </Section>

            <Section title="Portal Logic" description="Orders unlock only after profile submission and superadmin activation.">
              <p className="text-sm leading-6 text-content-muted">
                Save each section to keep your work in sync. The final submit sends the completed profile to superadmin for review instead of unlocking orders immediately.
              </p>
            </Section>
          </div>
        )}
      </div>
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

function Notice({ tone, children }: { tone: 'error' | 'success' | 'warning'; children: ReactNode }) {
  const cls = tone === 'error'
    ? 'border-red-200 bg-red-50 text-red-600'
    : tone === 'warning'
      ? 'border-amber-200 bg-amber-50 text-amber-800'
      : 'border-emerald-200 bg-emerald-50 text-emerald-700'
  return <div className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${cls}`}>{children}</div>
}

function ToggleField({ label, checked, onChange, disabled = false }: { label: string; checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-2xl border border-brand-purple/12 px-4 py-3">
      <span className="text-sm font-medium text-content-secondary">{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 rounded border-brand-purple/30" disabled={disabled} />
    </label>
  )
}

function ChecklistItem({ done, children }: { done?: boolean; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${done ? 'bg-emerald-100 text-emerald-700' : 'bg-surface-subtle text-content-muted'}`}>
        {done ? '✓' : '•'}
      </span>
      <span className={done ? 'text-content-primary' : 'text-content-muted'}>{children}</span>
    </div>
  )
}

const inputCls = 'w-full rounded-2xl border border-brand-purple/20 bg-white px-4 py-3 text-sm text-content-primary outline-none transition-all focus:border-brand-purple disabled:bg-surface-subtle disabled:text-content-muted'
const textareaCls = `${inputCls} resize-none`
