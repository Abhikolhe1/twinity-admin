'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { Plus, Search, ToggleLeft, ToggleRight, Edit2, Trash2, X, Loader2, ChevronDown, AlertCircle, FileText } from 'lucide-react'
import { adminApi } from '@/lib/api'
import Spinner, { PageLoader } from '@/components/ui/Spinner'
import { usePermissions } from '@/lib/permissions-context'

// ── Types ────────────────────────────────────────────────────────────────────

interface Template {
  id: string
  name: string
  name_ar: string
  description: string
  description_ar: string
  purpose: string
  purpose_ar: string
  sample_script: string
  sample_script_ar: string
  product_types: string[]
  duration: string
  is_active: boolean
  created_at: string
}

type FormState = {
  name: string
  nameAr: string
  description: string
  descriptionAr: string
  purpose: string
  purposeAr: string
  sampleScript: string
  sampleScriptAr: string
  productTypes: string[]
  duration: string
  isActive: boolean
}

// ── Constants ────────────────────────────────────────────────────────────────

const PRODUCT_TYPES = [
  { value: 'greeting',      label: 'Personal Greetings' },
  { value: 'video-ad', label: 'Video Ad' },
]

const DURATIONS = ['15s', '30s', '45s', '60s', '90s', '120s']

const PURPOSE_OPTIONS = [
  'Birthday Wish', 'Motivation', 'Shoutout', 'Congratulations',
  'Wedding', 'Graduation', 'Promotion', 'Holiday Greeting',
  'Thank You', 'Apology', 'Business Intro', 'Product Launch', 'Custom',
]

const EMPTY_FORM: FormState = {
  name: '',
  nameAr: '',
  description: '',
  descriptionAr: '',
  purpose: '',
  purposeAr: '',
  sampleScript: '',
  sampleScriptAr: '',
  productTypes: [],
  duration: '30s',
  isActive: true,
}

function templateToForm(t: Template): FormState {
  return {
    name:           t.name,
    nameAr:         t.name_ar,
    description:    t.description,
    descriptionAr:  t.description_ar,
    purpose:        t.purpose,
    purposeAr:      t.purpose_ar,
    sampleScript:   t.sample_script,
    sampleScriptAr: t.sample_script_ar,
    productTypes:   t.product_types ?? [],
    duration:       t.duration ?? '30s',
    isActive:       t.is_active,
  }
}

const fmt = (d: string) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

// ── Field component ──────────────────────────────────────────────────────────

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-content-secondary mb-1">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-content-muted mt-0.5">{hint}</p>}
    </div>
  )
}

const inputCls = 'w-full px-3 py-2 rounded-xl border border-brand-purple/20 text-sm text-content-primary placeholder:text-content-muted focus:outline-none focus:border-brand-purple bg-white transition-colors'
const textareaCls = `${inputCls} resize-none`

// ── Drawer ───────────────────────────────────────────────────────────────────

function TemplateDrawer({
  target,
  onClose,
  onSaved,
}: {
  target: Template | null
  onClose: () => void
  onSaved: (t: Template) => void
}) {
  const isEdit = !!target
  const [form, setForm] = useState<FormState>(target ? templateToForm(target) : EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k: keyof FormState, v: unknown) =>
    setForm(prev => ({ ...prev, [k]: v }))

  function toggleProductType(pt: string) {
    setForm(prev => ({
      ...prev,
      productTypes: prev.productTypes.includes(pt)
        ? prev.productTypes.filter(x => x !== pt)
        : [...prev.productTypes, pt],
    }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim())        { setError('Name (English) is required'); return }
    if (!form.nameAr.trim())      { setError('Name (Arabic) is required'); return }
    if (!form.purpose.trim())     { setError('Purpose (English) is required'); return }
    if (!form.sampleScript.trim()) { setError('Sample script is required'); return }
    if (form.productTypes.length === 0) { setError('Select at least one product type'); return }

    setError('')
    setSaving(true)
    try {
      const res: any = isEdit
        ? await adminApi.updateTemplate(target!.id, form)
        : await adminApi.createTemplate(form)
      onSaved(res.data)
    } catch (err: any) {
      setError(err.message || 'Save failed')
      setSaving(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-xl bg-white z-50 flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-brand-purple/10 shrink-0">
          <div>
            <h2 className="text-base font-bold text-content-primary">
              {isEdit ? 'Edit Template' : 'New Template'}
            </h2>
            <p className="text-xs text-content-muted mt-0.5">
              {isEdit ? `Editing: ${target!.name}` : 'Create a new prompt template'}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-content-muted hover:bg-surface-subtle transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={submit} className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">

          {/* Names */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Name (English) *">
              <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Birthday Wish" />
            </Field>
            <Field label="Name (Arabic) *">
              <input className={inputCls} dir="rtl" value={form.nameAr} onChange={e => set('nameAr', e.target.value)} placeholder="الاسم بالعربية" />
            </Field>
          </div>

          {/* Descriptions */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Description (English)">
              <textarea className={textareaCls} rows={2} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Short description" />
            </Field>
            <Field label="Description (Arabic)">
              <textarea className={textareaCls} dir="rtl" rows={2} value={form.descriptionAr} onChange={e => set('descriptionAr', e.target.value)} placeholder="الوصف بالعربية" />
            </Field>
          </div>

          {/* Purpose */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Purpose (English) *">
              <div className="relative">
                <select
                  className={`${inputCls} appearance-none pr-8`}
                  value={PURPOSE_OPTIONS.includes(form.purpose) ? form.purpose : 'Custom'}
                  onChange={e => {
                    if (e.target.value !== 'Custom') set('purpose', e.target.value)
                    else set('purpose', '')
                  }}
                >
                  <option value="">Select purpose...</option>
                  {PURPOSE_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-content-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              {(!PURPOSE_OPTIONS.includes(form.purpose) || form.purpose === '') && (
                <input className={`${inputCls} mt-2`} value={form.purpose} onChange={e => set('purpose', e.target.value)} placeholder="Custom purpose..." />
              )}
            </Field>
            <Field label="Purpose (Arabic)">
              <input className={inputCls} dir="rtl" value={form.purposeAr} onChange={e => set('purposeAr', e.target.value)} placeholder="الغرض بالعربية" />
            </Field>
          </div>

          {/* Product Types + Duration */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Product Types *" hint="Select all that apply">
              <div className="flex flex-col gap-1.5 mt-1">
                {PRODUCT_TYPES.map(({ value, label }) => (
                  <label key={value} className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={form.productTypes.includes(value)}
                      onChange={() => toggleProductType(value)}
                      className="w-3.5 h-3.5 accent-brand-purple"
                    />
                    <span className="text-sm text-content-primary">{label}</span>
                  </label>
                ))}
              </div>
            </Field>
            <Field label="Default Duration">
              <div className="relative">
                <select
                  className={`${inputCls} appearance-none pr-8`}
                  value={form.duration}
                  onChange={e => set('duration', e.target.value)}
                >
                  {DURATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-content-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </Field>
          </div>

          {/* Sample Scripts */}
          <Field label="Sample Script (English) *" hint="This pre-fills the script field in the customer wizard">
            <textarea
              className={textareaCls}
              rows={5}
              value={form.sampleScript}
              onChange={e => set('sampleScript', e.target.value)}
              placeholder="Hey [Name]! Happy Birthday! Wishing you an amazing day full of joy..."
            />
          </Field>
          <Field label="Sample Script (Arabic)">
            <textarea
              className={`${textareaCls}`}
              dir="rtl"
              rows={5}
              value={form.sampleScriptAr}
              onChange={e => set('sampleScriptAr', e.target.value)}
              placeholder="مرحبًا [الاسم]! عيد ميلاد سعيد!..."
            />
          </Field>

          {/* Status */}
          <Field label="Status">
            <label className="flex items-center gap-2.5 cursor-pointer select-none mt-0.5">
              <div
                onClick={() => set('isActive', !form.isActive)}
                className={`w-9 h-5 rounded-full transition-colors relative ${form.isActive ? 'bg-emerald-500' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.isActive ? 'translate-x-4' : ''}`} />
              </div>
              <span className="text-sm text-content-primary">{form.isActive ? 'Active' : 'Inactive'}</span>
            </label>
          </Field>

          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}
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
            onClick={submit as any}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition-all"
            style={{ background: 'linear-gradient(135deg,#9a78fe,#422266)' }}
          >
            {saving
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
              : isEdit ? 'Save Changes' : 'Create Template'
            }
          </button>
        </div>
      </div>
    </>
  )
}

// ── Delete confirm modal ─────────────────────────────────────────────────────

function DeleteModal({
  name,
  onConfirm,
  onClose,
  deleting,
}: {
  name: string
  onConfirm: () => void
  onClose: () => void
  deleting: boolean
}) {
  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
              <Trash2 className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="font-bold text-content-primary text-sm">Delete Template</p>
              <p className="text-xs text-content-muted mt-0.5">This action cannot be undone.</p>
            </div>
          </div>
          <p className="text-sm text-content-secondary">
            Are you sure you want to delete <span className="font-semibold text-content-primary">{name}</span>?
          </p>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2 rounded-xl text-sm font-medium border border-brand-purple/20 text-content-secondary hover:bg-surface-subtle transition-all">
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={deleting}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-60 transition-all"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  'greeting':      'Personal Greetings',
  'video-ad': 'Video Ad',
}

const PRODUCT_TYPE_COLORS: Record<string, string> = {
  'greeting':      'bg-blue-50 text-blue-700',
  'video-ad': 'bg-purple-50 text-purple-700',
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [productFilter, setProductFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Template | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Template | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [toggling, setToggling] = useState<Set<string>>(new Set())
  const permissions = usePermissions()
  const canManage = permissions.includes('templates.manage')

  const fetchTemplates = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (productFilter !== 'all') params.set('productType', productFilter)
    if (statusFilter !== 'all') params.set('status', statusFilter)
    adminApi.templates(params.toString())
      .then((res: any) => setTemplates(res.data || []))
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [search, productFilter, statusFilter])

  useEffect(() => { fetchTemplates() }, [fetchTemplates])

  async function handleToggle(id: string) {
    if (toggling.has(id)) return
    setToggling(prev => new Set(prev).add(id))
    try {
      const res: any = await adminApi.toggleTemplate(id)
      setTemplates(prev => prev.map(t => t.id === id ? { ...t, is_active: res.data.is_active } : t))
    } catch {}
    setToggling(prev => { const s = new Set(prev); s.delete(id); return s })
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await adminApi.deleteTemplate(deleteTarget.id)
      setTemplates(prev => prev.filter(t => t.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch {}
    setDeleting(false)
  }

  function openCreate() {
    setEditTarget(null)
    setDrawerOpen(true)
  }

  function openEdit(t: Template) {
    setEditTarget(t)
    setDrawerOpen(true)
  }

  function onSaved(t: Template) {
    setTemplates(prev => {
      const idx = prev.findIndex(x => x.id === t.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = t
        return next
      }
      return [t, ...prev]
    })
    setDrawerOpen(false)
    setEditTarget(null)
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-content-primary">Prompt Templates</h1>
          <p className="text-sm text-content-muted mt-1">
            {templates.length} template{templates.length !== 1 ? 's' : ''} · Used in the customer video creation wizard
          </p>
        </div>
        {canManage && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-all"
            style={{ background: 'linear-gradient(135deg,#9a78fe,#422266)' }}
          >
            <Plus className="w-4 h-4" /> New Template
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative">
          <Search className="w-4 h-4 text-content-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search templates..."
            className="pl-9 pr-4 py-2 rounded-xl border border-brand-purple/20 text-sm outline-none focus:border-brand-purple bg-white text-content-primary placeholder:text-content-muted w-56 transition-colors"
          />
        </div>

        <div className="relative">
          <select
            value={productFilter}
            onChange={e => setProductFilter(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 rounded-xl border border-brand-purple/20 text-sm outline-none focus:border-brand-purple bg-white text-content-primary transition-colors"
          >
            <option value="all">All Product Types</option>
            {PRODUCT_TYPES.map(pt => <option key={pt.value} value={pt.value}>{pt.label}</option>)}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-content-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        <div className="relative">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 rounded-xl border border-brand-purple/20 text-sm outline-none focus:border-brand-purple bg-white text-content-primary transition-colors"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-content-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-brand-purple/12 shadow-card overflow-hidden">
        {loading ? (
          <div className="py-20 flex justify-center"><Spinner /></div>
        ) : templates.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-3 text-content-muted">
            <FileText className="w-10 h-10 opacity-30" />
            <p className="text-sm font-medium">No templates found</p>
            {canManage && (
              <button
                onClick={openCreate}
                className="mt-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
                style={{ background: 'linear-gradient(135deg,#9a78fe,#422266)' }}
              >
                Create your first template
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-sm divide-y divide-brand-purple/6">
            <thead>
              <tr className="border-b border-brand-purple/8">
                <th className="px-5 py-3 text-left text-xs font-semibold text-content-muted uppercase tracking-wide">Template</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-content-muted uppercase tracking-wide">Purpose</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-content-muted uppercase tracking-wide">Product Types</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-content-muted uppercase tracking-wide">Duration</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-content-muted uppercase tracking-wide">Status</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-content-muted uppercase tracking-wide">Created</th>
                {canManage && <th className="px-5 py-3 text-right text-xs font-semibold text-content-muted uppercase tracking-wide">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-purple/6">
              {templates.map(t => (
                <tr key={t.id} className="hover:bg-surface-subtle/40 transition-colors">

                  {/* Name */}
                  <td className="px-5 py-4">
                    <p className="font-semibold text-content-primary">{t.name}</p>
                    {t.name_ar && <p className="text-xs text-content-muted mt-0.5" dir="rtl">{t.name_ar}</p>}
                    {t.description && <p className="text-xs text-content-muted mt-1 max-w-xs truncate">{t.description}</p>}
                  </td>

                  {/* Purpose */}
                  <td className="px-5 py-4">
                    <p className="text-content-secondary">{t.purpose || '—'}</p>
                    {t.purpose_ar && <p className="text-xs text-content-muted mt-0.5" dir="rtl">{t.purpose_ar}</p>}
                  </td>

                  {/* Product Types */}
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1">
                      {(t.product_types ?? []).map(pt => (
                        <span key={pt} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${PRODUCT_TYPE_COLORS[pt] ?? 'bg-surface-subtle text-content-muted'}`}>
                          {PRODUCT_TYPE_LABELS[pt] ?? pt}
                        </span>
                      ))}
                    </div>
                  </td>

                  {/* Duration */}
                  <td className="px-5 py-4 text-content-secondary">{t.duration}</td>

                  {/* Status */}
                  <td className="px-5 py-4">
                    {canManage ? (
                      <button
                        onClick={() => handleToggle(t.id)}
                        disabled={toggling.has(t.id)}
                        className="flex items-center gap-1.5 text-sm disabled:opacity-50"
                      >
                        {toggling.has(t.id) ? (
                          <Loader2 className="w-4 h-4 animate-spin text-content-muted" />
                        ) : t.is_active ? (
                          <ToggleRight className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <ToggleLeft className="w-5 h-5 text-content-muted" />
                        )}
                        <span className={t.is_active ? 'text-emerald-600 font-medium' : 'text-content-muted'}>
                          {t.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </button>
                    ) : (
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${t.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-surface-subtle text-content-muted'}`}>
                        {t.is_active ? 'Active' : 'Inactive'}
                      </span>
                    )}
                  </td>

                  {/* Created */}
                  <td className="px-5 py-4 text-content-muted text-xs">{fmt(t.created_at)}</td>

                  {/* Actions */}
                  {canManage && (
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(t)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-content-muted hover:text-brand-purple hover:bg-surface-subtle transition-all"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(t)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-content-muted hover:text-red-500 hover:bg-red-50 transition-all"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Drawer */}
      {drawerOpen && (
        <TemplateDrawer
          target={editTarget}
          onClose={() => { setDrawerOpen(false); setEditTarget(null) }}
          onSaved={onSaved}
        />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <DeleteModal
          name={deleteTarget.name}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
          deleting={deleting}
        />
      )}
    </div>
  )
}
