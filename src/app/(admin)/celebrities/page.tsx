'use client'
import { useEffect, useRef, useState } from 'react'
import { Plus, ToggleLeft, ToggleRight, Edit2, Star, X, Loader2, ChevronDown, ImagePlus, Trash2, Mic, CheckCircle2, Upload, Music2, AlertCircle, Wand2 } from 'lucide-react'
import { adminApi } from '@/lib/api'
import Spinner, { PageLoader } from '@/components/ui/Spinner'
import { usePermissions } from '@/lib/permissions-context'

// ── Types ──────────────────────────────────────────────────────────────────
interface Celeb {
  id: string
  name: string
  name_ar: string
  slug: string
  industry: string
  nationality: string
  nationality_ar: string
  contact_email?: string | null
  initials: string
  avatar_color: string
  thumbnail_url?: string
  bio?: string
  bio_ar?: string
  languages: string[]
  tags: string[]
  tags_ar: string[]
  voice_model_id?: string
  is_active: boolean
  is_featured: boolean
  onboarding_status?: string
  portal_admin?: {
    id: string
    email: string
    is_active: boolean
  } | null
  price_range: {
    greeting: { min: number; max: number }
    'video-ad': { min: number; max: number }
  }
  total_orders: number
}

type FormState = {
  name: string; nameAr: string; slug: string; industry: string
  nationality: string; nationalityAr: string; initials: string
  bio: string; bioAr: string; avatarColor: string; thumbnailUrl: string
  languages: string; tags: string; tagsAr: string
  voiceModelId: string
  isFeatured: boolean; isActive: boolean
  processThumbnail: boolean
  priceGreetingMin: string; priceGreetingMax: string
  priceAvatarMin: string; priceAvatarMax: string
}

// ── Constants ───────────────────────────────────────────────────────────────
const INDUSTRIES = [
  'entertainment', 'sports', 'business', 'music',
  'media', 'fashion', 'comedy', 'food', 'gaming', 'fitness',
]

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

const EMPTY_FORM: FormState = {
  name: '', nameAr: '', slug: '', industry: 'entertainment',
  nationality: '', nationalityAr: '', initials: '',
  bio: '', bioAr: '', avatarColor: AVATAR_COLORS[0], thumbnailUrl: '',
  languages: '', tags: '', tagsAr: '',
  voiceModelId: '',
  isFeatured: false, isActive: true,
  processThumbnail: false,
  priceGreetingMin: '500', priceGreetingMax: '2000',
  priceAvatarMin: '2000', priceAvatarMax: '8000',
}

function generateSlug(name: string) {
  return name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

function celebToForm(c: Celeb): FormState {
  return {
    name: c.name,
    nameAr: c.name_ar,
    slug: c.slug,
    industry: c.industry,
    nationality: c.nationality,
    nationalityAr: c.nationality_ar,
    initials: c.initials,
    bio: c.bio ?? '',
    bioAr: c.bio_ar ?? '',
    avatarColor: c.avatar_color,
    thumbnailUrl: c.thumbnail_url ?? '',
    languages: c.languages.join(', '),
    tags: c.tags.join(', '),
    tagsAr: c.tags_ar.join(', '),
    voiceModelId: c.voice_model_id ?? '',
    isFeatured: c.is_featured,
    isActive: c.is_active,
    processThumbnail: false,
    priceGreetingMin: String(c.price_range?.greeting?.min ?? 0),
    priceGreetingMax: String(c.price_range?.greeting?.max ?? 0),
    priceAvatarMin: String(c.price_range?.['video-ad']?.min ?? 0),
    priceAvatarMax: String(c.price_range?.['video-ad']?.max ?? 0),
  }
}

function formToBody(f: FormState) {
  const splitArr = (s: string) => s.split(',').map(x => x.trim()).filter(Boolean)
  return {
    name: f.name.trim(),
    nameAr: f.nameAr.trim(),
    slug: f.slug || generateSlug(f.name),
    industry: f.industry,
    nationality: f.nationality.trim(),
    nationalityAr: f.nationalityAr.trim(),
    initials: f.initials.trim() || f.name.slice(0, 2).toUpperCase(),
    bio: f.bio.trim() || undefined,
    bioAr: f.bioAr.trim() || undefined,
    avatarColor: f.avatarColor,
    thumbnailUrl: f.thumbnailUrl.trim() || undefined,
    languages: splitArr(f.languages),
    tags: splitArr(f.tags),
    tagsAr: splitArr(f.tagsAr),
    voiceModelId: f.voiceModelId.trim() || undefined,
    isFeatured: f.isFeatured,
    isActive: f.isActive,
    processThumbnail: f.processThumbnail,
    priceRange: {
      greeting:        { min: Number(f.priceGreetingMin) || 0, max: Number(f.priceGreetingMax) || 0 },
      'video-ad': { min: Number(f.priceAvatarMin)   || 0, max: Number(f.priceAvatarMax)   || 0 },
    },
  }
}

function validateCelebForm(form: FormState): string | null {
  if (!form.name.trim()) return 'Name (EN) is required.'
  if (!form.nameAr.trim()) return 'Name (AR) is required.'
  if (!form.industry.trim()) return 'Industry is required.'
  if (!form.nationality.trim()) return 'Nationality (EN) is required.'
  if (!form.nationalityAr.trim()) return 'Nationality (AR) is required.'
  if (!form.bio.trim()) return 'Bio (English) is required.'
  if (!form.languages.split(',').map(x => x.trim()).filter(Boolean).length) return 'At least one language is required.'
  if (!form.thumbnailUrl.trim() && !form.avatarColor.trim()) return 'Add a profile image or keep an avatar color selected.'

  const priceRows = [
    { label: 'Personal Greetings', min: Number(form.priceGreetingMin), max: Number(form.priceGreetingMax) },
    { label: 'Video Ad', min: Number(form.priceAvatarMin), max: Number(form.priceAvatarMax) },
  ]

  for (const row of priceRows) {
    if (!Number.isFinite(row.min) || row.min < 0) return `${row.label} minimum price is required.`
    if (!Number.isFinite(row.max) || row.max < 0) return `${row.label} maximum price is required.`
    if (row.max < row.min) return `${row.label} max price must be greater than or equal to min price.`
  }

  return null
}

// ── Field helpers ───────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-content-secondary mb-1.5">{label}</label>
      {children}
    </div>
  )
}

const inputCls = 'w-full px-3 py-2 text-sm rounded-xl border border-brand-purple/20 bg-white text-content-primary focus:outline-none focus:border-brand-purple transition-colors placeholder:text-content-muted'
const textareaCls = inputCls + ' resize-none'

// ── Drawer ──────────────────────────────────────────────────────────────────
function CelebDrawer({
  editTarget,
  onClose,
  onSaved,
}: {
  editTarget: Celeb | null
  onClose: () => void
  onSaved: (c: Celeb) => void
}) {
  const isEdit = !!editTarget
  const [form, setForm] = useState<FormState>(editTarget ? celebToForm(editTarget) : EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const imgInputRef = useRef<HTMLInputElement>(null)

  function onImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setForm(prev => ({ ...prev, thumbnailUrl: ev.target?.result as string }))
    reader.readAsDataURL(file)
    // reset input so same file can be re-selected
    e.target.value = ''
  }

  function set(field: keyof FormState, value: string | boolean) {
    setForm(prev => {
      const next = { ...prev, [field]: value }
      // auto-generate slug and initials when name changes (add mode only)
      if (field === 'name' && !isEdit) {
        next.slug = generateSlug(value as string)
        next.initials = (value as string).split(' ').map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase()
      }
      return next
    })
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const validationError = validateCelebForm(form)
    if (validationError) {
      setError(validationError)
      return
    }
    setSaving(true)
    setError('')
    try {
      const body = formToBody(form)
      let res: any
      if (isEdit) {
        res = await adminApi.updateCeleb(editTarget!.id, body)
      } else {
        res = await adminApi.createCeleb(body)
      }
      onSaved(res.data)
    } catch (err: any) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-brand-purple/10 shrink-0">
          <div>
            <h2 className="text-base font-bold text-content-primary">
              {isEdit ? 'Edit Celebrity' : 'Add Celebrity'}
            </h2>
            {isEdit && (
              <p className="text-xs text-content-muted mt-0.5">{editTarget!.name}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-content-muted hover:text-content-primary hover:bg-surface-subtle transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form body */}
        <form onSubmit={submit} className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">

          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Basic Info */}
          <section>
            <p className="text-[11px] font-bold uppercase tracking-wider text-content-muted mb-3">Basic Info</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Name (English) *">
                <input value={form.name} onChange={e => set('name', e.target.value)} className={inputCls} placeholder="e.g. Ahmed Al Rashidi" />
              </Field>
              <Field label="Name (Arabic) *">
                <input dir="rtl" value={form.nameAr} onChange={e => set('nameAr', e.target.value)} className={inputCls} placeholder="أحمد الراشدي" />
              </Field>
              <Field label="Slug">
                <input value={form.slug} onChange={e => set('slug', e.target.value)} className={inputCls} placeholder="ahmed-al-rashidi" />
              </Field>
              <Field label="Initials (max 3)">
                <input value={form.initials} onChange={e => set('initials', e.target.value.toUpperCase().slice(0, 3))} className={inputCls} placeholder="AR" maxLength={3} />
              </Field>
              <Field label="Industry *">
                <div className="relative">
                  <select value={form.industry} onChange={e => set('industry', e.target.value)} className={inputCls + ' appearance-none pr-8'}>
                    {INDUSTRIES.map(i => (
                      <option key={i} value={i}>{i.charAt(0).toUpperCase() + i.slice(1)}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted pointer-events-none" />
                </div>
              </Field>
              <Field label="Nationality (EN) *">
                <input value={form.nationality} onChange={e => set('nationality', e.target.value)} className={inputCls} placeholder="Saudi Arabian" />
              </Field>
              <Field label="Nationality (AR)">
                <input dir="rtl" value={form.nationalityAr} onChange={e => set('nationalityAr', e.target.value)} className={inputCls} placeholder="سعودي" />
              </Field>
            </div>
          </section>

          {/* Bio */}
          <section>
            <p className="text-[11px] font-bold uppercase tracking-wider text-content-muted mb-3">Bio</p>
            <div className="flex flex-col gap-3">
              <Field label="Bio (English)">
                <textarea value={form.bio} onChange={e => set('bio', e.target.value)} className={textareaCls} rows={3} placeholder="Short celebrity bio..." />
              </Field>
              <Field label="Bio (Arabic)">
                <textarea dir="rtl" value={form.bioAr} onChange={e => set('bioAr', e.target.value)} className={textareaCls} rows={3} placeholder="نبذة قصيرة..." />
              </Field>
            </div>
          </section>

          {/* Appearance */}
          <section>
            <p className="text-[11px] font-bold uppercase tracking-wider text-content-muted mb-3">Appearance</p>
            <div className="flex flex-col gap-4">

              {/* Avatar color swatches */}
              <Field label="Avatar Color (fallback when no image)">
                <div className="flex gap-2 flex-wrap">
                  {AVATAR_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => set('avatarColor', color)}
                      className="w-8 h-8 rounded-lg transition-all shrink-0"
                      style={{
                        background: color,
                        boxShadow: form.avatarColor === color ? '0 0 0 3px #9a78fe' : 'none',
                      }}
                    />
                  ))}
                </div>
              </Field>

              {/* Image upload */}
              <Field label="Profile Image">
                <div className="flex items-start gap-4">
                  {/* Preview */}
                  <div
                    className="w-24 h-28 rounded-xl overflow-hidden shrink-0 flex items-center justify-center border border-brand-purple/15"
                    style={{ background: form.avatarColor }}
                  >
                    {form.thumbnailUrl ? (
                      <img
                        src={form.thumbnailUrl}
                        alt="preview"
                        className="w-full h-full object-cover object-top"
                      />
                    ) : (
                      <span className="text-white font-bold text-lg">
                        {form.initials || '?'}
                      </span>
                    )}
                  </div>

                  {/* Upload controls */}
                  <div className="flex flex-col gap-2 flex-1">
                    <input
                      ref={imgInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={onImageFile}
                    />
                    <button
                      type="button"
                      onClick={() => imgInputRef.current?.click()}
                      className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-brand-purple/25 text-sm font-medium text-content-secondary hover:text-brand-purple hover:border-brand-purple/50 hover:bg-surface-subtle transition-all"
                    >
                      <ImagePlus className="w-4 h-4" />
                      {form.thumbnailUrl ? 'Change Image' : 'Upload Image'}
                    </button>
                    {form.thumbnailUrl && (
                      <button
                        type="button"
                        onClick={() => set('thumbnailUrl', '')}
                        className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-red-200 text-sm font-medium text-red-500 hover:bg-red-50 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                        Remove Image
                      </button>
                    )}
                    <p className="text-[11px] text-content-muted leading-relaxed">
                      PNG, JPG or WEBP. Shown as portrait (4:5) in the celebrities grid.
                    </p>
                  </div>
                </div>
              </Field>

              {/* URL fallback */}
              <Field label="Or paste image URL">
                <input
                  value={form.thumbnailUrl.startsWith('data:') ? '' : form.thumbnailUrl}
                  onChange={e => set('thumbnailUrl', e.target.value)}
                  className={inputCls}
                  placeholder="https://..."
                />
              </Field>

              {/* AI thumbnail processing */}
              {form.thumbnailUrl && (
                <div
                  onClick={() => set('processThumbnail', !form.processThumbnail)}
                  className={[
                    'flex items-start gap-3 px-4 py-3 rounded-xl border cursor-pointer select-none transition-all',
                    form.processThumbnail
                      ? 'border-brand-purple/40 bg-surface-subtle'
                      : 'border-brand-purple/15 hover:border-brand-purple/30 hover:bg-surface-subtle/50',
                  ].join(' ')}
                >
                  <div
                    className={[
                      'mt-0.5 w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-all',
                      form.processThumbnail
                        ? 'border-brand-purple'
                        : 'border-brand-purple/30 bg-white',
                    ].join(' ')}
                    style={form.processThumbnail ? { background: 'linear-gradient(135deg,#9a78fe,#422266)', borderColor: 'transparent' } : {}}
                  >
                    {form.processThumbnail && (
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Wand2 className="w-3.5 h-3.5 text-brand-purple shrink-0" />
                      <span className="text-sm font-semibold text-content-primary">Process thumbnail with AI</span>
                    </div>
                    <p className="text-[11px] text-content-muted mt-0.5 leading-relaxed">
                      Gemini will enhance the uploaded image using the Thumbnail Process Instructions saved in Settings → AI Prompts before saving.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Metadata */}
          <section>
            <p className="text-[11px] font-bold uppercase tracking-wider text-content-muted mb-3">Metadata (comma-separated)</p>
            <div className="flex flex-col gap-3">
              <Field label="Languages">
                <input value={form.languages} onChange={e => set('languages', e.target.value)} className={inputCls} placeholder="Arabic, English" />
              </Field>
              <Field label="Tags (EN)">
                <input value={form.tags} onChange={e => set('tags', e.target.value)} className={inputCls} placeholder="actor, host, presenter" />
              </Field>
              <Field label="Tags (AR)">
                <input dir="rtl" value={form.tagsAr} onChange={e => set('tagsAr', e.target.value)} className={inputCls} placeholder="ممثل، مذيع" />
              </Field>
            </div>
          </section>

          {/* Pricing */}
          <section>
            <p className="text-[11px] font-bold uppercase tracking-wider text-content-muted mb-3">Pricing (USD)</p>
            <div className="flex flex-col gap-3">
              {[
                { label: 'Personal Greetings', minKey: 'priceGreetingMin', maxKey: 'priceGreetingMax' },
                { label: 'Video Ad', minKey: 'priceAvatarMin', maxKey: 'priceAvatarMax' },
              ].map(row => (
                <div key={row.label} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <div>
                    <p className="text-xs text-content-muted mb-1">{row.label} — Min</p>
                    <input
                      type="number" min="0"
                      value={form[row.minKey as keyof FormState] as string}
                      onChange={e => set(row.minKey as keyof FormState, e.target.value)}
                      className={inputCls}
                      placeholder="0"
                    />
                  </div>
                  <span className="text-content-muted text-sm mt-4">—</span>
                  <div>
                    <p className="text-xs text-content-muted mb-1">Max</p>
                    <input
                      type="number" min="0"
                      value={form[row.maxKey as keyof FormState] as string}
                      onChange={e => set(row.maxKey as keyof FormState, e.target.value)}
                      className={inputCls}
                      placeholder="0"
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* AI Models */}
          <section>
            <p className="text-[11px] font-bold uppercase tracking-wider text-content-muted mb-3">AI Model IDs</p>
            <Field label="ElevenLabs Voice ID">
              <input value={form.voiceModelId} onChange={e => set('voiceModelId', e.target.value)} className={inputCls} placeholder="Set automatically via Clone Voice" />
            </Field>
            <p className="text-[11px] text-content-muted mt-1.5">
              Use the Clone Voice button on the celebrity card to generate this via ElevenLabs.
            </p>
          </section>

          {/* Status */}
          <section>
            <p className="text-[11px] font-bold uppercase tracking-wider text-content-muted mb-3">Status</p>
            <div className="flex gap-4">
              {[
                { label: 'Active', field: 'isActive' as keyof FormState },
                { label: 'Featured', field: 'isFeatured' as keyof FormState },
              ].map(({ label, field }) => (
                <label key={field} className="flex items-center gap-2.5 cursor-pointer select-none">
                  <div
                    onClick={() => set(field, !(form[field] as boolean))}
                    className={`relative w-10 h-5 rounded-full transition-colors ${form[field] ? 'bg-brand-purple' : 'bg-brand-purple/20'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form[field] ? 'translate-x-5' : ''}`} />
                  </div>
                  <span className="text-sm font-medium text-content-secondary">{label}</span>
                </label>
              ))}
            </div>
          </section>

          {/* Spacer so last section isn't hidden behind footer */}
          <div className="h-4" />
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-brand-purple/10 flex gap-3 shrink-0 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-brand-purple/20 text-content-secondary hover:bg-surface-subtle transition-all"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg,#9a78fe,#422266)' }}
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Celebrity'}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Clone Voice Modal ───────────────────────────────────────────────────────
function CloneVoiceModal({
  celeb,
  onClose,
  onSuccess,
}: {
  celeb: Celeb
  onClose: () => void
  onSuccess: (voiceModelId: string, message: string) => void
}) {
  const [audioFiles, setAudioFiles] = useState<File[]>([])
  const [language, setLanguage] = useState('ar')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const audioInputRef = useRef<HTMLInputElement>(null)

  function addAudio(files: FileList | null) {
    if (!files) return
    const AUDIO_EXT = /\.(mp3|wav|m4a|ogg|aac|flac|wma|webm)$/i
    const arr = Array.from(files).filter(f =>
      f.type.startsWith('audio/') || AUDIO_EXT.test(f.name)
    )
    setAudioFiles(prev => [...prev, ...arr].slice(0, 25))
  }

  function removeAudio(idx: number) {
    setAudioFiles(prev => prev.filter((_, i) => i !== idx))
  }

  async function submit() {
    if (audioFiles.length === 0) { setError('Upload at least one audio sample.'); return }
    setError('')
    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('language', language)
      audioFiles.forEach(f => formData.append('audio', f))
      const res: any = await adminApi.cloneVoice(celeb.id, formData)
      onSuccess(res.data?.voice_model_id ?? '', res.message ?? 'Voice cloned')
    } catch (err: any) {
      setError(err.message || 'Voice cloning failed')
      setSubmitting(false)
    }
  }

  const atMax = audioFiles.length >= 25
  const totalMB = audioFiles.reduce((s, f) => s + f.size, 0) / 1024 / 1024

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-brand-purple/10 shrink-0">
            <div>
              <h2 className="text-base font-bold text-content-primary">Clone Voice — {celeb.name}</h2>
              <p className="text-xs text-content-muted mt-0.5">
                {celeb.voice_model_id ? `Current ID: ${celeb.voice_model_id.slice(0, 20)}…` : 'No voice clone yet'}
              </p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-content-muted hover:bg-surface-subtle transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">

            {/* Info banner */}
            <div className="rounded-xl bg-surface-subtle border border-brand-purple/10 px-4 py-3 text-xs text-content-muted leading-relaxed">
              Upload 1–25 audio samples of the celebrity speaking. Best results with clear speech, no background music, varied sentences. Each file up to 50 MB (MP3, WAV, M4A).
            </div>

            {/* Language */}
            <div>
              <label className="text-sm font-semibold text-content-primary mb-1.5 block">
                Voice Language <span className="text-red-500">*</span>
              </label>
              <select
                value={language}
                onChange={e => setLanguage(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-brand-purple/20 text-sm text-content-primary focus:outline-none focus:border-brand-purple bg-white appearance-none"
              >
                <option value="Arabic">Arabic</option>
                <option value="English">English</option>
              </select>
              <p className="text-xs text-content-muted mt-1">Primary language the celebrity speaks in the samples.</p>
            </div>

            {celeb.voice_model_id && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-700 leading-relaxed">
                A voice clone already exists (<span className="font-mono">{celeb.voice_model_id}</span>). Submitting will create a new clone and replace the stored ID.
              </div>
            )}

            {/* Dropzone */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-content-primary">Audio Samples</p>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  audioFiles.length === 0 ? 'bg-surface-subtle text-content-muted'
                  : audioFiles.length < 3 ? 'bg-amber-50 text-amber-700'
                  : 'bg-emerald-50 text-emerald-700'
                }`}>
                  {audioFiles.length} / 25 {audioFiles.length > 0 && `· ${totalMB.toFixed(1)} MB`}
                </span>
              </div>

              <div
                className="border-2 border-dashed border-brand-purple/25 rounded-xl p-5 text-center cursor-pointer hover:border-brand-purple/50 hover:bg-surface-subtle/50 transition-all"
                onClick={() => !atMax && audioInputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); addAudio(e.dataTransfer.files) }}
              >
                <div className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#9a78fe,#422266)' }}>
                  <Music2 className="w-5 h-5 text-white" />
                </div>
                <p className="text-sm font-medium text-content-secondary">
                  {atMax ? 'Maximum 25 files reached' : 'Click or drag audio files here'}
                </p>
                <p className="text-xs text-content-muted mt-1">MP3, WAV, M4A — multiple files allowed</p>
                <input
                  ref={audioInputRef}
                  type="file"
                  multiple
                  accept="audio/*"
                  className="hidden"
                  onChange={e => addAudio(e.target.files)}
                />
              </div>

              {/* File list */}
              {audioFiles.length > 0 && (
                <div className="mt-3 flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                  {audioFiles.map((f, idx) => (
                    <div key={idx} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-subtle border border-brand-purple/10">
                      <Music2 className="w-3.5 h-3.5 text-brand-purple shrink-0" />
                      <span className="text-xs font-medium text-content-primary flex-1 truncate">{f.name}</span>
                      <span className="text-[10px] text-content-muted shrink-0">{(f.size / 1024 / 1024).toFixed(1)} MB</span>
                      <button onClick={() => removeAudio(idx)} className="text-content-muted hover:text-red-500 transition-colors shrink-0">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-brand-purple/10 flex gap-3 shrink-0 bg-white">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-brand-purple/20 text-content-secondary hover:bg-surface-subtle transition-all"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={submitting || audioFiles.length === 0}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition-all"
              style={{ background: 'linear-gradient(135deg,#9a78fe,#422266)' }}
            >
              {submitting
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Cloning...</>
                : <><Mic className="w-4 h-4" /> Clone Voice in ElevenLabs</>}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function CelebritiesPage() {
  const [celebs, setCelebs] = useState<Celeb[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<Set<string>>(new Set())
  const [portalBusy, setPortalBusy] = useState<Set<string>>(new Set())
  const [portalMsg, setPortalMsg] = useState<Record<string, string>>({})
  const [voiceMsg, setVoiceMsg] = useState<Record<string, string>>({})
  const [voiceModalCeleb, setVoiceModalCeleb] = useState<Celeb | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Celeb | null>(null)
  const [search, setSearch] = useState('')
  const permissions = usePermissions()
  const canManage = permissions.includes('celebrities.manage')

  useEffect(() => {
    adminApi.celebrities()
      .then((res: any) => setCelebs(res.data || []))
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [])


  async function toggle(id: string) {
    if (toggling.has(id)) return
    setToggling(prev => new Set(prev).add(id))
    try {
      const res: any = await adminApi.toggleCeleb(id)
      setCelebs(prev => prev.map(c => c.id === id ? { ...c, is_active: res.data.is_active } : c))
    } catch {}
    setToggling(prev => { const s = new Set(prev); s.delete(id); return s })
  }

  function onVoiceSuccess(celebId: string, voiceModelId: string, message: string) {
    setCelebs(prev => prev.map(c => c.id === celebId ? { ...c, voice_model_id: voiceModelId } : c))
    setVoiceMsg(prev => ({ ...prev, [celebId]: message }))
    setVoiceModalCeleb(null)
  }

  async function toggleFeatured(celeb: Celeb) {
    try {
      const res: any = await adminApi.updateCeleb(celeb.id, { isFeatured: !celeb.is_featured })
      setCelebs(prev => prev.map(c => c.id === celeb.id ? { ...c, is_featured: res.data.is_featured } : c))
    } catch {}
  }

  async function createPortalAccess(celeb: Celeb) {
    if (portalBusy.has(celeb.id) || !celeb.contact_email) return
    setPortalBusy(prev => new Set(prev).add(celeb.id))
    setPortalMsg(prev => ({ ...prev, [celeb.id]: '' }))
    try {
      const res: any = await adminApi.createCelebrityPortalAccess(celeb.id)
      setCelebs(prev => prev.map(c => c.id === celeb.id
        ? {
            ...c,
            is_active: res.data.celebrity.is_active,
            onboarding_status: res.data.celebrity.onboarding_status,
            portal_admin: {
              id: res.data.admin.id,
              email: res.data.admin.email,
              is_active: true,
            },
          }
        : c))
      setPortalMsg(prev => ({ ...prev, [celeb.id]: res.message || 'Portal access created.' }))
    } catch (err: any) {
      setPortalMsg(prev => ({ ...prev, [celeb.id]: err.message || 'Failed to create portal access.' }))
    } finally {
      setPortalBusy(prev => {
        const next = new Set(prev)
        next.delete(celeb.id)
        return next
      })
    }
  }

  function openAdd() {
    setEditTarget(null)
    setDrawerOpen(true)
  }

  function openEdit(celeb: Celeb) {
    setEditTarget(celeb)
    setDrawerOpen(true)
  }

  function onSaved(saved: Celeb) {
    if (editTarget) {
      setCelebs(prev => prev.map(c => c.id === saved.id ? saved : c))
    } else {
      setCelebs(prev => [saved, ...prev])
    }
    setDrawerOpen(false)
  }

  const filtered = search.trim()
    ? celebs.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.name_ar.includes(search) ||
        c.industry.includes(search.toLowerCase()))
    : celebs

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <h1 className="text-2xl font-bold text-content-primary">Celebrities</h1>
          <p className="text-sm text-content-muted mt-1">
            {celebs.filter(c => c.is_active).length} active · {celebs.length} total
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search..."
            className="px-3 py-2 text-sm rounded-xl border border-brand-purple/20 bg-white focus:outline-none focus:border-brand-purple transition-colors w-48"
          />
          {canManage && (
            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 shrink-0"
              style={{ background: 'linear-gradient(135deg,#9a78fe,#422266)' }}
            >
              <Plus className="w-4 h-4" /> Add Celebrity
            </button>
          )}
        </div>
      </div>

      {loading && <PageLoader />}

      {!loading && filtered.length === 0 && (
        <div className="text-sm text-content-muted text-center py-16">
          {search ? 'No celebrities match your search.' : 'No celebrities found.'}
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map(celeb => {
          const busy = toggling.has(celeb.id)
          const portalAccessBusy = portalBusy.has(celeb.id)
          return (
            <div
              key={celeb.id}
              className={`bg-white rounded-2xl border p-5 shadow-card transition-all ${celeb.is_active ? 'border-brand-purple/12' : 'border-brand-purple/8 opacity-60'}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className="w-12 h-16 rounded-xl flex items-center justify-center text-white font-bold text-sm overflow-hidden shrink-0"
                  style={{ background: celeb.avatar_color || 'linear-gradient(135deg,#9a78fe,#422266)' }}
                >
                  {celeb.thumbnail_url
                    ? <img src={celeb.thumbnail_url} alt={celeb.name} className="w-full h-full object-cover object-top" />
                    : celeb.initials}
                </div>
                <div className="flex items-center gap-1.5">
                  {canManage && (
                    <button
                      onClick={() => toggleFeatured(celeb)}
                      title={celeb.is_featured ? 'Remove featured' : 'Mark as featured'}
                      className="transition-transform hover:scale-110 active:scale-95"
                    >
                      <Star className={`w-3.5 h-3.5 ${celeb.is_featured ? 'text-amber-400 fill-amber-400' : 'text-content-muted'}`} />
                    </button>
                  )}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${celeb.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-surface-subtle text-content-muted'}`}>
                    {celeb.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              <h3 className="font-bold text-content-primary text-sm">{celeb.name}</h3>
              <p className="text-xs text-content-muted mt-0.5">{celeb.name_ar}</p>
              <p className="text-xs text-brand-purple capitalize mt-1">{celeb.industry}</p>
              {celeb.contact_email && (
                <p className="mt-2 text-[11px] text-content-muted break-all">{celeb.contact_email}</p>
              )}
              {celeb.portal_admin?.email ? (
                <p className="mt-1 text-[11px] text-emerald-700">Portal login: {celeb.portal_admin.email}</p>
              ) : (
                <p className="mt-1 text-[11px] text-amber-700">
                  {celeb.contact_email ? 'Portal access not created yet.' : 'Add a contact email to enable portal access.'}
                </p>
              )}

              <div className="mt-3 pt-3 border-t border-brand-purple/8 flex items-center justify-between">
                <div className="text-xs text-content-muted">
                  <span className="font-bold text-content-primary">{celeb.total_orders}</span> orders
                </div>
                <div className="text-xs text-content-muted">
                  from <span className="font-bold text-brand-purple">${(celeb.price_range?.greeting?.min || 0).toLocaleString()}</span>
                </div>
              </div>

              {canManage && (
                <div className="mt-3 flex flex-col gap-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(celeb)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium border border-brand-purple/20 text-content-secondary hover:border-brand-purple/40 hover:text-brand-purple transition-all"
                    >
                      <Edit2 className="w-3 h-3" /> Edit
                    </button>
                    <button
                      onClick={() => toggle(celeb.id)}
                      disabled={busy}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                        celeb.is_active
                          ? 'border border-red-200 text-red-600 hover:bg-red-50'
                          : 'border border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                      }`}
                    >
                      {busy
                        ? <Spinner size="sm" />
                        : celeb.is_active
                          ? <ToggleLeft className="w-3 h-3" />
                          : <ToggleRight className="w-3 h-3" />}
                      {celeb.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>

                  {/* Clone Voice */}
                  <button
                    onClick={() => setVoiceModalCeleb(celeb)}
                    className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      celeb.voice_model_id
                        ? 'border-brand-purple/20 text-content-secondary hover:border-brand-purple/40 hover:text-brand-purple'
                        : 'border-brand-purple/30 text-brand-purple bg-brand-purple/5 hover:bg-brand-purple/10'
                    }`}
                  >
                    {celeb.voice_model_id
                      ? <><CheckCircle2 className="w-3 h-3 text-emerald-600" /> Re-clone Voice</>
                      : <><Mic className="w-3 h-3" /> Clone Voice</>}
                  </button>

                  <button
                    onClick={() => createPortalAccess(celeb)}
                    disabled={portalAccessBusy || !celeb.contact_email}
                    className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium border transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                      celeb.portal_admin?.email
                        ? 'border-brand-purple/20 text-content-secondary hover:border-brand-purple/40 hover:text-brand-purple'
                        : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                    }`}
                  >
                    {portalAccessBusy
                      ? <><Loader2 className="w-3 h-3 animate-spin" /> Sending...</>
                      : celeb.portal_admin?.email
                        ? 'Resend Credentials'
                        : 'Create Portal Access'}
                  </button>

                  {portalMsg[celeb.id] && (
                    <p className={`text-[10px] text-center ${portalMsg[celeb.id].toLowerCase().includes('failed') || portalMsg[celeb.id].toLowerCase().includes('denied') ? 'text-red-500' : 'text-emerald-600'}`}>
                      {portalMsg[celeb.id]}
                    </p>
                  )}

                  {voiceMsg[celeb.id] && (
                    <p className={`text-[10px] text-center ${voiceMsg[celeb.id].toLowerCase().includes('fail') || voiceMsg[celeb.id].toLowerCase().includes('error') ? 'text-red-500' : 'text-emerald-600'}`}>
                      {voiceMsg[celeb.id]}
                    </p>
                  )}
                  {celeb.voice_model_id && !voiceMsg[celeb.id] && (
                    <p className="text-[10px] text-center text-content-muted">
                      Voice ID: <span className="font-mono">{celeb.voice_model_id.slice(0, 18)}{celeb.voice_model_id.length > 18 ? '…' : ''}</span>
                    </p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Drawer */}
      {drawerOpen && (
        <CelebDrawer
          editTarget={editTarget}
          onClose={() => setDrawerOpen(false)}
          onSaved={onSaved}
        />
      )}

      {/* Clone Voice Modal */}
      {voiceModalCeleb && (
        <CloneVoiceModal
          celeb={voiceModalCeleb}
          onClose={() => setVoiceModalCeleb(null)}
          onSuccess={(voiceModelId, message) => onVoiceSuccess(voiceModalCeleb.id, voiceModelId, message)}
        />
      )}
    </div>
  )
}
