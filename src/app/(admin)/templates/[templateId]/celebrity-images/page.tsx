'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { RefreshCw, Loader2, ImageIcon, ArrowLeft, Trash2, AlertCircle, Upload, Zap, Globe } from 'lucide-react'
import { adminApi } from '@/lib/api'
import Spinner from '@/components/ui/Spinner'
import { usePermissions } from '@/lib/permissions-context'

const TTS_MODELS = [
  { value: 'eleven_v3',              label: 'Twinity Pro',    Icon: Zap  },
  { value: 'eleven_multilingual_v2', label: 'Twinity Global', Icon: Globe },
]

interface Template {
  id: string
  name: string
  background_image_url: string | null
}

interface Celebrity {
  id: string
  name: string
  thumbnail_url: string | null
  initials: string
  avatar_color: string
  is_active: boolean
}

interface TemplateAsset {
  id: string
  template_id: string
  celebrity_id: string
  composite_image_url: string
  tts_model: string
  created_at: string
}

export default function CelebrityImagesPage() {
  const { templateId } = useParams<{ templateId: string }>()
  const router = useRouter()
  const permissions = usePermissions()
  const canManage = permissions.includes('templates.manage')

  const [template,    setTemplate]    = useState<Template | null>(null)
  const [celebrities, setCelebrities] = useState<Celebrity[]>([])
  const [assets,      setAssets]      = useState<TemplateAsset[]>([])
  const [loadingPage, setLoadingPage] = useState(true)
  const [generating,  setGenerating]  = useState<Set<string>>(new Set())
  const [uploading,   setUploading]   = useState<Set<string>>(new Set())
  const [deleting,    setDeleting]    = useState<Set<string>>(new Set())
  const [savingModel, setSavingModel] = useState<Set<string>>(new Set())
  const [error,       setError]       = useState('')

  const fileInputRef    = useRef<HTMLInputElement>(null)
  const pendingCelebRef = useRef<Celebrity | null>(null)

  useEffect(() => {
    Promise.all([
      adminApi.templates() as Promise<any>,
      adminApi.celebrities() as Promise<any>,
      adminApi.templateAssets(templateId) as Promise<any>,
    ]).then(([tplRes, celRes, assetRes]) => {
      const tpl = (tplRes.data || []).find((t: Template) => t.id === templateId) ?? null
      setTemplate(tpl)
      setCelebrities((celRes.celebrities || celRes.data || []).filter((c: Celebrity) => c.is_active))
      setAssets(assetRes.data || [])
    }).catch(() => setError('Failed to load data'))
      .finally(() => setLoadingPage(false))
  }, [templateId])

  const assetMap = new Map<string, TemplateAsset>(assets.map(a => [a.celebrity_id, a]))

  const refetchAssets = useCallback(() => {
    adminApi.templateAssets(templateId)
      .then((res: any) => setAssets(res.data || []))
      .catch(() => null)
  }, [templateId])

  async function handleGenerate(celebrity: Celebrity) {
    setGenerating(prev => new Set(prev).add(celebrity.id))
    setError('')
    try {
      const res: any = await adminApi.generateTemplateAsset({ templateId, celebrityId: celebrity.id })
      setAssets(prev => [res.data, ...prev.filter(a => a.celebrity_id !== celebrity.id)])
    } catch (err: any) {
      setError(err.message || 'Generation failed')
    } finally {
      setGenerating(prev => { const s = new Set(prev); s.delete(celebrity.id); return s })
    }
  }

  function triggerUpload(celeb: Celebrity) {
    pendingCelebRef.current = celeb
    fileInputRef.current?.click()
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file  = e.target.files?.[0]
    const celeb = pendingCelebRef.current
    e.target.value = ''
    if (!file || !celeb) return

    setUploading(prev => new Set(prev).add(celeb.id))
    setError('')
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const res: any = await adminApi.uploadTemplateAsset({ templateId, celebrityId: celeb.id, dataUrl })
      setAssets(prev => [res.data, ...prev.filter(a => a.celebrity_id !== celeb.id)])
    } catch (err: any) {
      setError(err.message || 'Upload failed')
    } finally {
      setUploading(prev => { const s = new Set(prev); s.delete(celeb.id); return s })
    }
  }

  async function handleDelete(celebrity: Celebrity) {
    const asset = assetMap.get(celebrity.id)
    if (!asset) return
    setDeleting(prev => new Set(prev).add(celebrity.id))
    try {
      await adminApi.deleteTemplateAsset(asset.id)
      setAssets(prev => prev.filter(a => a.id !== asset.id))
    } catch (err: any) {
      setError(err.message || 'Delete failed')
    } finally {
      setDeleting(prev => { const s = new Set(prev); s.delete(celebrity.id); return s })
    }
  }

  async function handleModelChange(celebrity: Celebrity, ttsModel: string) {
    const asset = assetMap.get(celebrity.id)
    if (!asset) return
    setSavingModel(prev => new Set(prev).add(celebrity.id))
    try {
      await (adminApi as any).updateTemplateAssetTtsModel(asset.id, ttsModel)
      setAssets(prev => prev.map(a => a.id === asset.id ? { ...a, tts_model: ttsModel } : a))
    } catch (err: any) {
      setError(err.message || 'Failed to save model')
    } finally {
      setSavingModel(prev => { const s = new Set(prev); s.delete(celebrity.id); return s })
    }
  }

  if (loadingPage) {
    return <div className="p-8 flex justify-center"><Spinner /></div>
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/templates')}
          className="flex items-center gap-1.5 text-sm text-content-muted hover:text-brand-purple transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Templates
        </button>

        <div className="flex items-center gap-4">
          {template?.background_image_url && (
            <div className="rounded-xl overflow-hidden border border-brand-purple/12 shadow-card shrink-0" style={{ width: 96, height: 54 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={template.background_image_url} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-content-primary">
              {template?.name ?? 'Template'} — Celebrity Images
            </h1>
            <p className="text-sm text-content-muted mt-0.5">
              {celebrities.length} celebrities · {assets.length} composite{assets.length !== 1 ? 's' : ''} generated
            </p>
          </div>
        </div>
      </div>

      {!template?.background_image_url && (
        <div className="flex flex-col items-center gap-3 py-20 text-content-muted">
          <ImageIcon className="w-10 h-10 opacity-30" />
          <p className="text-sm font-medium">This template has no background image</p>
          <p className="text-xs">Upload a background image to the template first.</p>
        </div>
      )}

      {template?.background_image_url && (
        <>
          {error && (
            <div className="mb-5 flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {celebrities.map(celeb => {
              const asset    = assetMap.get(celeb.id)
              const isGen    = generating.has(celeb.id)
              const isUp     = uploading.has(celeb.id)
              const isDel    = deleting.has(celeb.id)
              const isSaving = savingModel.has(celeb.id)

              return (
                <div key={celeb.id} className="bg-white rounded-2xl border border-brand-purple/12 shadow-card overflow-hidden">
                  {/* Composite image preview */}
                  <div className="relative aspect-video bg-surface-subtle">
                    {asset ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={asset.composite_image_url} alt="" className="w-full h-full object-contain" />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-content-muted">
                        <ImageIcon className="w-8 h-8 opacity-25" />
                        <span className="text-xs">Not generated</span>
                      </div>
                    )}
                    {(isGen || isUp) && (
                      <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                        <Loader2 className="w-7 h-7 animate-spin text-brand-purple" />
                      </div>
                    )}
                    {asset && (
                      <span className="absolute top-2 left-2 rounded bg-emerald-500/90 px-2 py-0.5 text-[10px] font-semibold text-white">
                        Generated
                      </span>
                    )}
                  </div>

                  {/* Celebrity name + action buttons */}
                  <div className="px-3 pt-3 pb-2 flex items-center gap-3">
                    {celeb.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={celeb.thumbnail_url} alt="" className="size-9 rounded-full object-cover shrink-0 ring-1 ring-black/10" />
                    ) : (
                      <span
                        className="flex size-9 items-center justify-center rounded-full shrink-0 text-xs font-bold text-white"
                        style={{ background: celeb.avatar_color || '#9a78fe' }}
                      >
                        {celeb.initials}
                      </span>
                    )}
                    <span className="text-sm font-semibold text-content-primary flex-1 truncate">{celeb.name}</span>

                    {canManage && (
                      <div className="flex items-center gap-1 shrink-0">
                        {asset && (
                          <button
                            onClick={() => handleDelete(celeb)}
                            disabled={isDel || isGen || isUp}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-content-muted hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-40"
                            title="Remove composite"
                          >
                            {isDel ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        )}
                        <button
                          onClick={() => triggerUpload(celeb)}
                          disabled={isGen || isUp || isDel}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-content-muted hover:text-brand-purple hover:bg-brand-purple/10 transition-all disabled:opacity-40"
                          title="Upload composite manually"
                        >
                          {isUp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => handleGenerate(celeb)}
                          disabled={isGen || isUp || isDel}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50 transition-all hover:opacity-90"
                          style={{ background: 'linear-gradient(135deg,#9a78fe,#422266)' }}
                        >
                          {isGen ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                          {asset ? 'Regenerate' : 'Generate'}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* ElevenLabs TTS model selector — shown only when asset exists */}
                  {asset && canManage && (
                    <div className="px-3 pb-3 pt-0">
                      <p className="text-[11px] font-semibold text-content-muted mb-1.5">Voice Model</p>
                      <div
                        className="relative flex rounded-full p-[3px]"
                        style={{ background: 'rgba(154,120,254,0.07)', border: '1px solid rgba(154,120,254,0.18)' }}
                      >
                        {TTS_MODELS.map(({ value, label, Icon }) => {
                          const active = (asset.tts_model || 'eleven_v3') === value
                          return (
                            <button
                              key={value}
                              onClick={() => !isSaving && handleModelChange(celeb, value)}
                              disabled={isSaving || isGen || isUp || isDel}
                              className="relative flex-1 flex items-center justify-center gap-1 py-1.5 rounded-full text-[11px] font-semibold transition-all duration-200 disabled:opacity-50 select-none"
                              style={active ? {
                                background: 'linear-gradient(135deg, #9a78fe, #422266)',
                                color: '#fff',
                                boxShadow: '0 1px 10px rgba(154,120,254,0.40)',
                              } : {
                                background: 'transparent',
                                color: 'rgba(154,120,254,0.75)',
                              }}
                            >
                              <Icon className="w-2.5 h-2.5 shrink-0" />
                              {label}
                            </button>
                          )
                        })}
                        {isSaving && (
                          <div className="absolute inset-0 flex items-center justify-center rounded-full" style={{ background: 'rgba(255,255,255,0.65)' }}>
                            <Loader2 className="w-3 h-3 animate-spin" style={{ color: '#9a78fe' }} />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Placeholder row when no asset yet, to maintain consistent card height */}
                  {!asset && (
                    <div className="px-3 pb-3 pt-2">
                      <p className="text-[10px] text-content-muted">Generate an image to configure the voice model.</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
