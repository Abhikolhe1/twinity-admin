'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Save, Eye, EyeOff, Settings2, Bot, Layers, Cloud, CheckCircle2, AlertCircle, Loader2, Sparkles, Upload, Trash2, ImageIcon } from 'lucide-react'
import { adminApi } from '@/lib/api'
import { usePermissions } from '@/lib/permissions-context'

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = 'general' | 'ai-keys' | 'watermark' | 'aws' | 'ai-prompts'

interface FormState {
  platformName: string
  supportEmail: string
  adminEmail: string
  elevenLabsKey: string
  creatifyApiId: string
  creatifyApiKey: string
  falApiKey: string
  openaiKey: string
  geminiApiKey: string
  watermarkText: string
  watermarkOpacity: string
  watermarkPosition: string
  watermarkImageUrl: string
  awsAccessKeyId: string
  awsSecretAccessKey: string
  awsRegion: string
  s3Bucket: string
  scriptImprovePrompt: string
  scriptEnhancePrompt: string
  thumbnailProcessPrompt: string
}

const TABS: { id: Tab; label: string; desc: string; icon: React.ElementType }[] = [
  { id: 'general',    label: 'General',       desc: 'Platform name & contacts',   icon: Settings2 },
  { id: 'ai-keys',    label: 'AI API Keys',   desc: 'Voice & video generation',   icon: Bot },
  { id: 'ai-prompts', label: 'AI Prompts',    desc: 'Script & thumbnail prompts', icon: Sparkles },
  { id: 'watermark',  label: 'Watermark',     desc: 'Preview overlay settings',   icon: Layers },
  { id: 'aws',        label: 'AWS / Storage', desc: 'S3 bucket & region',         icon: Cloud },
]

const DEFAULT_FORM: FormState = {
  platformName: '',
  supportEmail: '',
  adminEmail: '',
  elevenLabsKey: '',
  creatifyApiId: '',
  creatifyApiKey: '',
  falApiKey: '',
  openaiKey: '',
  geminiApiKey: '',
  watermarkText: '',
  watermarkOpacity: '',
  watermarkPosition: 'Bottom Center',
  watermarkImageUrl: '',
  awsAccessKeyId: '',
  awsSecretAccessKey: '',
  awsRegion: 'us-east-1',
  s3Bucket: '',
  scriptImprovePrompt: '',
  scriptEnhancePrompt: '',
  thumbnailProcessPrompt: '',
}

const SECRET_FIELDS = [
  'elevenLabsKey',
  'creatifyApiId',
  'creatifyApiKey',
  'falApiKey',
  'openaiKey',
  'geminiApiKey',
  'awsSecretAccessKey',
] as const

// ── Sub-components (defined OUTSIDE to prevent focus loss on re-render) ───────

function Field({
  label,
  hint,
  badge,
  children,
}: {
  label: string
  hint?: string
  badge?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="mb-5 last:mb-0">
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm font-semibold text-content-primary">{label}</label>
        {badge}
      </div>
      {children}
      {hint && <p className="text-xs text-content-muted mt-1.5">{hint}</p>}
    </div>
  )
}

function SettingsInput({
  value,
  onChange,
  type = 'text',
  placeholder = '',
  mono = false,
}: {
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  mono?: boolean
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={[
        'w-full px-3.5 py-2.5 rounded-xl border border-brand-purple/20 text-sm outline-none',
        'focus:border-brand-purple focus:shadow-[0_0_0_3px_rgba(154,120,254,0.10)]',
        'bg-white text-content-primary placeholder:text-content-muted transition-all',
        mono ? 'font-mono' : '',
      ].join(' ')}
    />
  )
}

function StatusBadge({ configured }: { configured: boolean }) {
  return configured ? (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
      <CheckCircle2 className="w-3 h-3" /> Configured
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
      <AlertCircle className="w-3 h-3" /> Not set
    </span>
  )
}

type SecretFieldKey = keyof Pick<
  FormState,
  'elevenLabsKey' | 'creatifyApiId' | 'creatifyApiKey' | 'falApiKey' | 'openaiKey' | 'geminiApiKey' | 'awsSecretAccessKey'
>

function SecretField({
  label,
  hint,
  keyId,
  fieldKey,
  value,
  hasValue,
  visible,
  onChange,
  onToggleVisible,
}: {
  label: string
  hint?: string
  keyId: string
  fieldKey: SecretFieldKey
  value: string
  hasValue: boolean
  visible: boolean
  onChange: (key: SecretFieldKey, val: string) => void
  onToggleVisible: (keyId: string) => void
}) {
  return (
    <Field label={label} hint={hint} badge={<StatusBadge configured={hasValue} />}>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(fieldKey, e.target.value)}
          placeholder="Paste your API key here"
          className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-brand-purple/20 text-sm outline-none focus:border-brand-purple focus:shadow-[0_0_0_3px_rgba(154,120,254,0.10)] bg-white text-content-primary placeholder:text-content-muted transition-all font-mono"
        />
        <button
          type="button"
          onClick={() => onToggleVisible(keyId)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-content-muted hover:text-brand-purple transition-colors"
        >
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </Field>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const VALID_TABS: Tab[] = ['general', 'ai-keys', 'ai-prompts', 'watermark', 'aws']

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsInner />
    </Suspense>
  )
}

function SettingsInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialTab = (searchParams.get('tab') as Tab | null)
  const [tab, setTab] = useState<Tab>(
    initialTab && VALID_TABS.includes(initialTab) ? initialTab : 'general'
  )
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [originalSecrets, setOriginalSecrets] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [wmUploading, setWmUploading] = useState(false)
  const [wmError, setWmError] = useState('')
  const wmFileRef = useRef<HTMLInputElement>(null)
  const permissions = usePermissions()
  const canManage = permissions.includes('settings.manage')


  useEffect(() => {
    adminApi.getSettings()
      .then((raw) => {
        const res = raw as { success: boolean; data: Record<string, string> }
        const d = res.data || {}
        setForm({
          platformName:   d.platformName   || '',
          supportEmail:   d.supportEmail   || '',
          adminEmail:     d.adminEmail     || '',
          elevenLabsKey:  d.elevenLabsKey  || '',
          creatifyApiId:  d.creatifyApiId  || '',
          creatifyApiKey: d.creatifyApiKey || '',
          falApiKey:      d.falApiKey      || '',
          openaiKey:      d.openaiKey      || '',
          geminiApiKey:   d.geminiApiKey   || '',
          watermarkText:     d.watermarkText     || '',
          watermarkOpacity:  d.watermarkOpacity  || '',
          watermarkPosition: d.watermarkPosition || 'Bottom Center',
          watermarkImageUrl: d.watermarkImageUrl || '',
          awsAccessKeyId:      d.awsAccessKeyId      || '',
          awsSecretAccessKey:  d.awsSecretAccessKey  || '',
          awsRegion:           d.awsRegion           || 'us-east-1',
          s3Bucket:            d.s3Bucket            || '',
          scriptImprovePrompt:    d.scriptImprovePrompt    || '',
          scriptEnhancePrompt:    d.scriptEnhancePrompt    || '',
          thumbnailProcessPrompt: d.thumbnailProcessPrompt || '',
        })
        const masked: Record<string, string> = {}
        for (const f of SECRET_FIELDS) {
          if (d[f]) masked[f] = d[f]
        }
        setOriginalSecrets(masked)
      })
      .catch(() => setError('Failed to load settings'))
      .finally(() => setLoading(false))
  }, [])

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function setSecretField(key: SecretFieldKey, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function toggleKey(keyId: string) {
    setShowKeys(v => ({ ...v, [keyId]: !v[keyId] }))
  }

  async function handleWatermarkImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setWmError('')
    setWmUploading(true)
    try {
      const fd = new FormData()
      fd.append('image', file)
      const res = await adminApi.uploadWatermarkImage(fd) as { success: boolean; url: string }
      setField('watermarkImageUrl', res.url)
    } catch (err: unknown) {
      setWmError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setWmUploading(false)
      if (wmFileRef.current) wmFileRef.current.value = ''
    }
  }

  async function handleWatermarkImageDelete() {
    setWmError('')
    setWmUploading(true)
    try {
      await adminApi.deleteWatermarkImage()
      setField('watermarkImageUrl', '')
    } catch (err: unknown) {
      setWmError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setWmUploading(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const payload: Record<string, string> = { ...form }
      for (const f of SECRET_FIELDS) {
        if (payload[f] === originalSecrets[f]) delete payload[f]
      }
      const res = await adminApi.saveSettings(payload) as { success: boolean; data: Record<string, string> }
      if (res.data) {
        const masked: Record<string, string> = {}
        for (const f of SECRET_FIELDS) {
          if (res.data[f]) {
            setField(f, res.data[f])
            masked[f] = res.data[f]
          }
        }
        setOriginalSecrets(masked)
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const activeTab = TABS.find(t => t.id === tab)!

  if (loading) {
    return (
      <div className="p-4 sm:p-8 flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-6 h-6 animate-spin text-brand-purple" />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-content-primary">Settings</h1>
        <p className="text-sm text-content-muted mt-1">Platform configuration and API integrations</p>
      </div>

      {error && (
        <div className="mb-5 flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSave}>
        <div className="flex flex-col lg:flex-row gap-5">

          {/* Vertical tab list */}
          <div className="lg:w-56 shrink-0">
            <div className="bg-white rounded-2xl border border-brand-purple/12 shadow-card overflow-hidden">
              {TABS.map(({ id, label, desc, icon: Icon }) => {
                const active = tab === id
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => { setTab(id); router.replace(`/settings?tab=${id}`) }}
                    className={[
                      'w-full flex items-center gap-3 px-4 py-3.5 text-left',
                      'border-b border-brand-purple/8 last:border-0 transition-all',
                      active ? 'bg-surface-subtle' : 'hover:bg-surface-subtle/60',
                    ].join(' ')}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={active ? { background: 'linear-gradient(135deg,#9a78fe,#422266)' } : {}}
                    >
                      <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-content-muted'}`} />
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold leading-none ${active ? 'text-brand-purple' : 'text-content-secondary'}`}>
                        {label}
                      </p>
                      <p className="text-[11px] text-content-muted mt-1 leading-tight">{desc}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Content card */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-2xl border border-brand-purple/12 shadow-card overflow-hidden">

              {/* Card header */}
              <div className="px-6 py-4 border-b border-brand-purple/8 flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'linear-gradient(135deg,#9a78fe,#422266)' }}
                >
                  <activeTab.icon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-content-primary">{activeTab.label}</p>
                  <p className="text-xs text-content-muted mt-0.5">{activeTab.desc}</p>
                </div>
              </div>

              {/* Card body */}
              <div className="p-6">

                {/* General */}
                {tab === 'general' && (
                  <div>
                    <Field label="Platform Name" hint="Displayed across the platform UI and emails">
                      <SettingsInput value={form.platformName} onChange={v => setField('platformName', v)} placeholder="Twinity" />
                    </Field>
                    <Field label="Support Email" hint="Shown to customers on contact and error pages">
                      <SettingsInput value={form.supportEmail} onChange={v => setField('supportEmail', v)} type="email" placeholder="support@twinity.ai" />
                    </Field>
                    <Field label="Admin Notification Email" hint="Receives alerts for new leads and job updates">
                      <SettingsInput value={form.adminEmail} onChange={v => setField('adminEmail', v)} type="email" placeholder="admin@twinity.ai" />
                    </Field>
                  </div>
                )}

                {/* AI API Keys */}
                {tab === 'ai-keys' && (
                  <div>
                    <div className="rounded-xl bg-surface-subtle border border-brand-purple/10 px-4 py-3 mb-6 text-xs text-content-muted leading-relaxed">
                      API keys are stored securely and used server-side only. Leave a field blank to use the built-in stub for that service.
                    </div>
                    <SecretField
                      label="ElevenLabs API Key"
                      hint="Voice cloning — TTS from celebrity's voiceModelId set on each celebrity profile"
                      keyId="elevenlabs" fieldKey="elevenLabsKey"
                      value={form.elevenLabsKey} hasValue={Boolean(originalSecrets.elevenLabsKey || form.elevenLabsKey)}
                      visible={!!showKeys.elevenlabs} onChange={setSecretField} onToggleVisible={toggleKey}
                    />
                    <div className="border-t border-brand-purple/8 my-5" />
                    <SecretField
                      label="Creatify API ID"
                      hint="Creatify Aurora video generation — obtain your API ID from the Creatify dashboard under API Keys"
                      keyId="creatifyApiId" fieldKey="creatifyApiId"
                      value={form.creatifyApiId} hasValue={Boolean(originalSecrets.creatifyApiId || form.creatifyApiId)}
                      visible={!!showKeys.creatifyApiId} onChange={setSecretField} onToggleVisible={toggleKey}
                    />
                    <SecretField
                      label="Creatify API Key"
                      hint="Creatify Aurora video generation — obtain your API Key from the Creatify dashboard under API Keys"
                      keyId="creatifyApiKey" fieldKey="creatifyApiKey"
                      value={form.creatifyApiKey} hasValue={Boolean(originalSecrets.creatifyApiKey || form.creatifyApiKey)}
                      visible={!!showKeys.creatifyApiKey} onChange={setSecretField} onToggleVisible={toggleKey}
                    />
                    <div className="border-t border-brand-purple/8 my-5" />
                    <SecretField
                      label="Fal.ai API Key"
                      hint="Fal.ai — used for Image Ad generation (FLUX Pro) and Seedance video generation. Get your key from fal.ai/dashboard under API Keys."
                      keyId="falApiKey" fieldKey="falApiKey"
                      value={form.falApiKey} hasValue={Boolean(originalSecrets.falApiKey || form.falApiKey)}
                      visible={!!showKeys.falApiKey} onChange={setSecretField} onToggleVisible={toggleKey}
                    />
                    <div className="border-t border-brand-purple/8 my-5" />
                    <SecretField
                      label="OpenAI API Key"
                      hint="ChatGPT — used to improve video scripts via the 'Improve with AI' button"
                      keyId="openai" fieldKey="openaiKey"
                      value={form.openaiKey} hasValue={Boolean(originalSecrets.openaiKey || form.openaiKey)}
                      visible={!!showKeys.openai} onChange={setSecretField} onToggleVisible={toggleKey}
                    />
                    <SecretField
                      label="Gemini API Key"
                      hint="Google Gemini — used to generate scene background images in the video customization step"
                      keyId="gemini" fieldKey="geminiApiKey"
                      value={form.geminiApiKey} hasValue={Boolean(originalSecrets.geminiApiKey || form.geminiApiKey)}
                      visible={!!showKeys.gemini} onChange={setSecretField} onToggleVisible={toggleKey}
                    />
                    <div className="border-t border-brand-purple/8 my-5" />
                    <div className="rounded-xl bg-surface-subtle border border-brand-purple/10 px-4 py-3 text-xs text-content-muted leading-relaxed space-y-3">
                      <div>
                        <strong className="text-content-secondary">Fal.ai webhook URL:</strong>
                        <code className="block mt-1 font-mono bg-white border border-brand-purple/15 px-2 py-1 rounded text-brand-purple break-all">
                          {typeof window !== 'undefined' ? window.location.origin.replace(':3001', ':4000') : 'https://your-api-domain'}/api/webhooks/fal
                        </code>
                        Set <code className="font-mono text-brand-purple">SERVER_URL</code> on the API server so this URL is registered with each fal.ai queue job. fal.ai will POST <code className="font-mono text-brand-purple">status: "OK"</code> or <code className="font-mono text-brand-purple">"ERROR"</code> when complete.
                      </div>
                      <div className="border-t border-brand-purple/10 pt-3">
                        <strong className="text-content-secondary">Creatify webhook URL (legacy):</strong>
                        <code className="block mt-1 font-mono bg-white border border-brand-purple/15 px-2 py-1 rounded text-brand-purple break-all">
                          {typeof window !== 'undefined' ? window.location.origin.replace(':3001', ':4000') : 'https://your-api-domain'}/api/webhooks/creatify
                        </code>
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Prompts */}
                {tab === 'ai-prompts' && (
                  <div>
                    <div className="rounded-xl bg-surface-subtle border border-brand-purple/10 px-4 py-3 mb-6 text-xs text-content-muted leading-relaxed">
                      Override the built-in AI system prompts. Leave a field blank to keep using the built-in default. Changes take effect immediately after saving.
                    </div>
                    <Field
                      label="Script Improve Prompt"
                      hint="Overrides the built-in system prompt for the 'Improve with AI' button in the customer video creation flow. Must instruct the model to return only the improved script text within 40 words."
                    >
                      <textarea
                        value={form.scriptImprovePrompt}
                        onChange={e => setField('scriptImprovePrompt', e.target.value)}
                        rows={6}
                        placeholder="Leave blank to use the built-in copywriter prompt…"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-brand-purple/20 text-sm outline-none focus:border-brand-purple focus:shadow-[0_0_0_3px_rgba(154,120,254,0.10)] bg-white text-content-primary placeholder:text-content-muted transition-all resize-none"
                      />
                    </Field>
                    <div className="border-t border-brand-purple/8 my-5" />
                    <Field
                      label="Script Enhance Prompt (TTS)"
                      hint="Overrides the built-in Arabic prosody enhancement prompt used to prepare scripts before sending to ElevenLabs. Leave blank to use the built-in ElevenLabs v3 optimizer."
                    >
                      <textarea
                        value={form.scriptEnhancePrompt}
                        onChange={e => setField('scriptEnhancePrompt', e.target.value)}
                        rows={6}
                        placeholder="Leave blank to use the built-in Arabic TTS prosody prompt…"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-brand-purple/20 text-sm outline-none focus:border-brand-purple focus:shadow-[0_0_0_3px_rgba(154,120,254,0.10)] bg-white text-content-primary placeholder:text-content-muted transition-all resize-none"
                      />
                    </Field>
                    <div className="border-t border-brand-purple/8 my-5" />
                    <Field
                      label="Thumbnail Process Instructions"
                      hint="Instructions sent to Gemini when 'Process thumbnail with AI' is checked on a celebrity profile. Gemini will edit/enhance the uploaded photo using these instructions before saving it as the thumbnail."
                    >
                      <textarea
                        value={form.thumbnailProcessPrompt}
                        onChange={e => setField('thumbnailProcessPrompt', e.target.value)}
                        rows={4}
                        placeholder="e.g. Remove the background and replace it with a clean gradient. Enhance lighting and make the image look professional and high-quality…"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-brand-purple/20 text-sm outline-none focus:border-brand-purple focus:shadow-[0_0_0_3px_rgba(154,120,254,0.10)] bg-white text-content-primary placeholder:text-content-muted transition-all resize-none"
                      />
                    </Field>
                  </div>
                )}

                {/* Watermark */}
                {tab === 'watermark' && (
                  <div>
                    <Field label="Watermark Image" hint="Upload a PNG/JPG logo. When set, this image is composited onto preview videos instead of the text below. Max 5 MB.">
                      {form.watermarkImageUrl ? (
                        <div className="flex items-center gap-4">
                          <div className="w-32 rounded-xl border border-brand-purple/20 bg-surface-subtle flex items-center justify-center overflow-hidden shrink-0 py-3 px-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={form.watermarkImageUrl} alt="Watermark" className="max-w-full max-h-full object-contain" />
                          </div>
                          <div className="flex flex-col gap-2">
                            <button
                              type="button"
                              onClick={() => wmFileRef.current?.click()}
                              disabled={wmUploading || !canManage}
                              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-brand-purple/30 text-sm font-semibold text-brand-purple hover:bg-surface-subtle transition-all disabled:opacity-50"
                            >
                              {wmUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                              Replace
                            </button>
                            <button
                              type="button"
                              onClick={handleWatermarkImageDelete}
                              disabled={wmUploading || !canManage}
                              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 text-sm font-semibold text-red-600 hover:bg-red-50 transition-all disabled:opacity-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Remove
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => wmFileRef.current?.click()}
                          disabled={wmUploading || !canManage}
                          className="flex items-center gap-3 w-full px-4 py-5 rounded-xl border-2 border-dashed border-brand-purple/25 hover:border-brand-purple/50 hover:bg-surface-subtle transition-all disabled:opacity-50"
                        >
                          {wmUploading
                            ? <Loader2 className="w-5 h-5 animate-spin text-brand-purple" />
                            : <ImageIcon className="w-5 h-5 text-content-muted" />
                          }
                          <span className="text-sm text-content-muted">
                            {wmUploading ? 'Uploading…' : 'Click to upload watermark image (PNG, JPG, SVG)'}
                          </span>
                        </button>
                      )}
                      <input
                        ref={wmFileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleWatermarkImageUpload}
                      />
                      {wmError && (
                        <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> {wmError}
                        </p>
                      )}
                    </Field>

                    <div className="border-t border-brand-purple/8 my-5" />

                    <div className="rounded-xl bg-surface-subtle border border-brand-purple/10 px-4 py-3 mb-5 text-xs text-content-muted leading-relaxed">
                      The settings below are used as a text watermark when no image is uploaded.
                    </div>

                    <Field label="Watermark Text" hint="Text overlaid on preview videos when no image is set">
                      <SettingsInput value={form.watermarkText} onChange={v => setField('watermarkText', v)} placeholder="twinity.ai · PREVIEW" />
                    </Field>
                    <Field label="Watermark Opacity" hint="Applies to both image and text watermark. Decimal between 0.1 (faint) and 1.0 (solid).">
                      <div className="flex items-center gap-4">
                        <SettingsInput value={form.watermarkOpacity} onChange={v => setField('watermarkOpacity', v)} placeholder="0.35" />
                        <div
                          className="h-9 w-24 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
                          style={{ background: `rgba(154,120,254,${parseFloat(form.watermarkOpacity) || 0.35})`, border: '1px solid rgba(154,120,254,0.25)' }}
                        >
                          <span className="text-brand-dark opacity-80">Preview</span>
                        </div>
                      </div>
                    </Field>
                    <Field label="Watermark Position" hint="Where the watermark appears on the video frame">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {['Bottom Center', 'Bottom Right', 'Top Right', 'Center'].map(pos => (
                          <label key={pos} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="watermark-position"
                              value={pos}
                              checked={form.watermarkPosition === pos}
                              onChange={() => setField('watermarkPosition', pos)}
                              className="accent-brand-purple"
                            />
                            <span className="text-sm text-content-secondary">{pos}</span>
                          </label>
                        ))}
                      </div>
                    </Field>
                  </div>
                )}

                {/* AWS */}
                {tab === 'aws' && (
                  <div>
                    <div className="rounded-xl bg-surface-subtle border border-brand-purple/10 px-4 py-3 mb-6 text-xs text-content-muted leading-relaxed">
                      AWS credentials are loaded from the database first, then fall back to environment variables. Configure here for production deployments.
                    </div>
                    <Field label="AWS Access Key ID" hint="IAM user access key with S3 read/write permissions">
                      <SettingsInput value={form.awsAccessKeyId} onChange={v => setField('awsAccessKeyId', v)} placeholder="AKIAIOSFODNN7EXAMPLE" mono />
                    </Field>
                    <SecretField label="AWS Secret Access Key" hint="Secret key paired with the access key ID above"
                      keyId="awsSecretAccessKey" fieldKey="awsSecretAccessKey"
                      value={form.awsSecretAccessKey} hasValue={Boolean(originalSecrets.awsSecretAccessKey || form.awsSecretAccessKey)}
                      visible={!!showKeys.awsSecretAccessKey} onChange={setSecretField} onToggleVisible={toggleKey} />
                    <Field label="AWS Region" hint="e.g. us-east-1, eu-west-1, me-south-1">
                      <SettingsInput value={form.awsRegion} onChange={v => setField('awsRegion', v)} placeholder="us-east-1" mono />
                    </Field>
                    <Field label="S3 Bucket" hint="Single bucket used for all assets — videos, celebrity images, and generated audio">
                      <SettingsInput value={form.s3Bucket} onChange={v => setField('s3Bucket', v)} placeholder="twinity-storage" mono />
                    </Field>
                  </div>
                )}

              </div>

              {/* Card footer — save */}
              {canManage && (
                <div className="px-6 py-4 border-t border-brand-purple/8 flex items-center justify-between bg-surface-subtle/40">
                  <p className="text-xs text-content-muted">
                    {saved ? 'All changes have been saved.' : 'Unsaved changes will be lost on navigation.'}
                  </p>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg,#9a78fe,#422266)' }}
                  >
                    {saving ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>
                    ) : saved ? (
                      <><CheckCircle2 className="w-3.5 h-3.5" /> Saved!</>
                    ) : (
                      <><Save className="w-3.5 h-3.5" /> Save Changes</>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      </form>
    </div>
  )
}
