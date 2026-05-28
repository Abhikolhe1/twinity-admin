'use client'
import { useState, useEffect } from 'react'
import { Layers, Plus, Pencil, Loader2, AlertCircle, ToggleLeft, ToggleRight, X, Trash2 } from 'lucide-react'
import { adminApi } from '@/lib/api'
import { usePermissions } from '@/lib/permissions-context'

interface ProductTypeDoc {
  id: string
  slug: string
  name: string
  name_ar: string
  description: string
  description_ar: string
  detail: string
  detail_ar: string
  icon: string
  price_from: number
  duration: string
  duration_ar: string
  use_cases: string[]
  use_cases_ar: string[]
  video_prompt: string
  gemini_system_prompt: string
  is_active: boolean
  order: number
}

type FormState = Omit<ProductTypeDoc, 'id'>

const EMPTY: FormState = {
  slug: '', name: '', name_ar: '', description: '', description_ar: '',
  detail: '', detail_ar: '', icon: '', price_from: 0,
  duration: '', duration_ar: '', use_cases: [], use_cases_ar: [],
  video_prompt: '', gemini_system_prompt: '',
  is_active: true, order: 0,
}

function useCasesFromText(text: string): string[] {
  return text.split(',').map(s => s.trim()).filter(Boolean)
}

export default function ProductTypesPage() {
  const permissions = usePermissions()
  const canManage = permissions.includes('settings.manage')

  const [types,   setTypes]   = useState<ProductTypeDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [saving,  setSaving]  = useState(false)

  const [modalOpen,      setModalOpen]      = useState(false)
  const [editing,        setEditing]        = useState<ProductTypeDoc | null>(null)
  const [form,           setForm]           = useState<FormState>(EMPTY)
  const [useCasesText,   setUseCasesText]   = useState('')
  const [useCasesArText, setUseCasesArText] = useState('')
  const [formError,      setFormError]      = useState('')
  const [deleteId,       setDeleteId]       = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await adminApi.productTypes() as { success: boolean; data: ProductTypeDoc[] }
      setTypes(res.data ?? [])
    } catch {
      setError('Failed to load product types')
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setEditing(null)
    setForm(EMPTY)
    setUseCasesText('')
    setUseCasesArText('')
    setFormError('')
    setModalOpen(true)
  }

  function openEdit(t: ProductTypeDoc) {
    setEditing(t)
    setForm({
      slug: t.slug, name: t.name, name_ar: t.name_ar,
      description: t.description, description_ar: t.description_ar,
      detail: t.detail, detail_ar: t.detail_ar,
      icon: t.icon, price_from: t.price_from,
      duration: t.duration, duration_ar: t.duration_ar,
      use_cases: t.use_cases, use_cases_ar: t.use_cases_ar,
      video_prompt: t.video_prompt,
      gemini_system_prompt: t.gemini_system_prompt,
      is_active: t.is_active, order: t.order,
    })
    setUseCasesText(t.use_cases.join(', '))
    setUseCasesArText(t.use_cases_ar.join(', '))
    setFormError('')
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.slug.trim()) { setFormError('Slug is required'); return }
    if (!form.name.trim()) { setFormError('Name is required'); return }
    if (!form.name_ar.trim()) { setFormError('Arabic name is required'); return }
    setSaving(true)
    setFormError('')
    try {
      const body = {
        ...form,
        use_cases:    useCasesFromText(useCasesText),
        use_cases_ar: useCasesFromText(useCasesArText),
      }
      if (editing) {
        const res = await adminApi.updateProductType(editing.id, body) as { success: boolean; data: ProductTypeDoc }
        setTypes(prev => prev.map(t => t.id === editing.id ? res.data : t))
      } else {
        const res = await adminApi.createProductType(body) as { success: boolean; data: ProductTypeDoc }
        setTypes(prev => [...prev, res.data])
      }
      setModalOpen(false)
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(id: string) {
    try {
      const res = await adminApi.toggleProductType(id) as { success: boolean; data: ProductTypeDoc }
      setTypes(prev => prev.map(t => t.id === id ? res.data : t))
    } catch { /* ignore */ }
  }

  async function handleDelete() {
    if (!deleteId) return
    try {
      await adminApi.deleteProductType(deleteId)
      setTypes(prev => prev.filter(t => t.id !== deleteId))
    } catch { /* ignore */ } finally {
      setDeleteId(null)
    }
  }

  const inputCls = 'w-full px-3.5 py-2.5 rounded-xl border border-brand-purple/20 text-sm text-content-primary placeholder:text-content-muted bg-white outline-none focus:border-brand-purple focus:shadow-[0_0_0_3px_rgba(154,120,254,0.10)] transition-all'
  const textareaCls = inputCls + ' resize-none'
  const labelCls = 'text-xs font-semibold text-content-secondary'

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-7 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-content-primary">Product Types</h1>
          <p className="text-sm text-content-muted mt-1">
            Manage video product types and their AI generation prompts.
          </p>
        </div>
        {canManage && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-all"
            style={{ background: 'linear-gradient(135deg,#9a78fe,#422266)' }}
          >
            <Plus className="w-4 h-4" />
            Add Product Type
          </button>
        )}
      </div>

      {error && (
        <div className="mb-5 flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-brand-purple" />
        </div>
      ) : types.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-surface-subtle flex items-center justify-center">
            <Layers className="w-7 h-7 text-brand-purple/40" />
          </div>
          <p className="text-content-muted text-sm">No product types yet.</p>
          {canManage && (
            <button onClick={openCreate} className="text-sm font-semibold text-brand-purple hover:underline">
              Add the first one
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {types.map(t => (
            <div key={t.id} className="bg-white rounded-2xl border border-brand-purple/12 shadow-card overflow-hidden flex flex-col">
              <div className="p-5 flex-1">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    {t.icon && <span className="text-2xl leading-none">{t.icon}</span>}
                    <div>
                      <p className="font-bold text-content-primary text-sm">{t.name}</p>
                      <p className="text-xs text-content-muted">{t.name_ar}</p>
                    </div>
                  </div>
                  <span className={`shrink-0 text-xs px-2 py-1 rounded-full font-medium ${t.is_active ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
                    {t.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <p className="text-xs text-content-muted mb-2">
                  <span className="font-mono bg-surface-subtle px-1.5 py-0.5 rounded text-brand-purple">{t.slug}</span>
                  {' · '}${t.price_from.toLocaleString()} starting
                </p>
                <p className="text-xs text-content-secondary line-clamp-2">{t.description}</p>

                <div className="mt-3 flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${t.video_prompt ? 'bg-emerald-400' : 'bg-gray-200'}`} />
                    <span className="text-xs text-content-muted">Video prompt {t.video_prompt ? 'set' : 'not set'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${t.gemini_system_prompt ? 'bg-emerald-400' : 'bg-gray-200'}`} />
                    <span className="text-xs text-content-muted">Gemini prompt {t.gemini_system_prompt ? 'set' : 'not set'}</span>
                  </div>
                </div>
              </div>

              {canManage && (
                <div className="px-5 py-3 border-t border-brand-purple/8 flex items-center gap-2">
                  <button
                    onClick={() => openEdit(t)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-brand-purple bg-surface-subtle hover:bg-brand-purple/10 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleToggle(t.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-content-secondary bg-surface-subtle hover:bg-brand-purple/10 hover:text-brand-purple transition-colors"
                  >
                    {t.is_active
                      ? <ToggleRight className="w-3.5 h-3.5 text-emerald-500" />
                      : <ToggleLeft className="w-3.5 h-3.5" />
                    }
                    {t.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => setDeleteId(t.id)}
                    className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(26,10,48,0.55)', backdropFilter: 'blur(4px)' }}
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-brand-purple/15 flex flex-col max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-brand-purple/10 shrink-0">
              <h3 className="text-base font-bold text-content-primary">
                {editing ? 'Edit Product Type' : 'New Product Type'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg hover:bg-surface-subtle text-content-muted hover:text-content-primary transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto p-6 flex flex-col gap-5">
              {/* Slug + icon */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 flex flex-col gap-1.5">
                  <label className={labelCls}>Slug <span className="text-red-500">*</span></label>
                  <input
                    value={form.slug}
                    onChange={e => setForm(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                    placeholder="video-ad"
                    className={inputCls}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>Icon (emoji)</label>
                  <input value={form.icon} onChange={e => setForm(p => ({ ...p, icon: e.target.value }))} placeholder="🎬" className={inputCls} />
                </div>
              </div>

              {/* Names */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>Name (EN) <span className="text-red-500">*</span></label>
                  <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Short Product Ads" className={inputCls} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>Name (AR) <span className="text-red-500">*</span></label>
                  <input value={form.name_ar} onChange={e => setForm(p => ({ ...p, name_ar: e.target.value }))} placeholder="إعلانات قصيرة" className={inputCls} dir="rtl" />
                </div>
              </div>

              {/* Short descriptions */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>Short Description (EN)</label>
                  <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Short celebrity Ad" className={inputCls} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>Short Description (AR)</label>
                  <input value={form.description_ar} onChange={e => setForm(p => ({ ...p, description_ar: e.target.value }))} placeholder="إعلان مشهور قصير" className={inputCls} dir="rtl" />
                </div>
              </div>

              {/* Long detail */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>Detail (EN)</label>
                  <textarea rows={2} value={form.detail} onChange={e => setForm(p => ({ ...p, detail: e.target.value }))} placeholder="Full description..." className={textareaCls} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>Detail (AR)</label>
                  <textarea rows={2} value={form.detail_ar} onChange={e => setForm(p => ({ ...p, detail_ar: e.target.value }))} placeholder="وصف كامل..." className={textareaCls} dir="rtl" />
                </div>
              </div>

              {/* Pricing, order, active */}
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>Price From ($)</label>
                  <input type="number" min={0} value={form.price_from} onChange={e => setForm(p => ({ ...p, price_from: Number(e.target.value) }))} className={inputCls} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>Sort Order</label>
                  <input type="number" min={0} value={form.order} onChange={e => setForm(p => ({ ...p, order: Number(e.target.value) }))} className={inputCls} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>Active</label>
                  <div className="flex items-center h-full pt-1">
                    <button type="button" onClick={() => setForm(p => ({ ...p, is_active: !p.is_active }))} className="flex items-center gap-2 text-sm font-medium text-content-primary">
                      {form.is_active
                        ? <ToggleRight className="w-6 h-6 text-emerald-500" />
                        : <ToggleLeft className="w-6 h-6 text-content-muted" />
                      }
                      {form.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Delivery */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>Delivery Time (EN)</label>
                  <input value={form.duration} onChange={e => setForm(p => ({ ...p, duration: e.target.value }))} placeholder="Delivery in 3–5 business days" className={inputCls} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>Delivery Time (AR)</label>
                  <input value={form.duration_ar} onChange={e => setForm(p => ({ ...p, duration_ar: e.target.value }))} placeholder="التسليم في 3-5 أيام عمل" className={inputCls} dir="rtl" />
                </div>
              </div>

              {/* Use cases */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>Use Cases (EN) — comma-separated</label>
                  <input value={useCasesText} onChange={e => setUseCasesText(e.target.value)} placeholder="Brand Ads, Product Launches" className={inputCls} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>Use Cases (AR) — comma-separated</label>
                  <input value={useCasesArText} onChange={e => setUseCasesArText(e.target.value)} placeholder="إعلانات العلامة التجارية، الإطلاق" className={inputCls} dir="rtl" />
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-brand-purple/10" />

              {/* AI Prompts */}
              <div className="flex flex-col gap-4">
                <p className="text-xs font-bold text-content-secondary uppercase tracking-widest">AI Prompts</p>

                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>Creatify — Video Generation Prompt</label>
                  <p className="text-xs text-content-muted -mt-0.5">Guides how Creatify Aurora renders the celebrity in the video. Describe tone, expression, motion style, and anything to avoid.</p>
                  <textarea
                    rows={4}
                    value={form.video_prompt}
                    onChange={e => setForm(p => ({ ...p, video_prompt: e.target.value }))}
                    placeholder="Calm, authoritative tone. Natural smiling expression. Subtle hand movements. Avoid: cartoon, blur, distorted eyes, low resolution..."
                    className={textareaCls}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>Gemini — Image Generation System Prompt</label>
                  <p className="text-xs text-content-muted -mt-0.5">System instruction injected into Gemini when customers generate background scenes for this product type.</p>
                  <textarea
                    rows={4}
                    value={form.gemini_system_prompt}
                    onChange={e => setForm(p => ({ ...p, gemini_system_prompt: e.target.value }))}
                    placeholder="You are a professional scene designer for celebrity ads. Generate clean, modern backgrounds..."
                    className={textareaCls}
                  />
                </div>
              </div>

              {formError && (
                <p className="text-sm text-red-600 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {formError}
                </p>
              )}
            </div>

            <div className="px-6 py-4 border-t border-brand-purple/10 flex items-center justify-end gap-3 shrink-0">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2.5 rounded-xl text-sm font-medium text-content-secondary hover:bg-surface-subtle transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 hover:opacity-90 transition-all"
                style={{ background: 'linear-gradient(135deg,#9a78fe,#422266)' }}
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editing ? 'Save Changes' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(26,10,48,0.55)', backdropFilter: 'blur(4px)' }}
          onClick={() => setDeleteId(null)}
        >
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-brand-purple/15 p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-content-primary mb-2">Delete Product Type?</h3>
            <p className="text-sm text-content-muted mb-5">This action cannot be undone.</p>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 rounded-xl text-sm font-medium text-content-secondary hover:bg-surface-subtle transition-colors">Cancel</button>
              <button onClick={handleDelete} className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
