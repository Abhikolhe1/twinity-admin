const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'

let adminToken: string | null = null
let activePortalMode: PortalMode = 'admin'

export type PortalMode = 'admin' | 'celebrity'

const PORTAL_MODE_KEY = 'twinity_portal_mode'
const TOKEN_KEY_PREFIX = 'twinity_portal_token_'

function normalizePortalMode(value?: string | null): PortalMode {
  return value === 'celebrity' ? 'celebrity' : 'admin'
}

function getTokenStorageKey(mode: PortalMode): string {
  return `${TOKEN_KEY_PREFIX}${mode}`
}

export function setPortalMode(mode: PortalMode) {
  activePortalMode = mode
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(PORTAL_MODE_KEY, mode)
  }
}

export function getPortalMode(): PortalMode {
  if (typeof window === 'undefined') return activePortalMode
  return normalizePortalMode(sessionStorage.getItem(PORTAL_MODE_KEY))
}

export function setAdminToken(t: string, mode: PortalMode = 'admin') {
  adminToken = t
  activePortalMode = mode
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(getTokenStorageKey(mode), t)
    sessionStorage.setItem(PORTAL_MODE_KEY, mode)
  }
}

export function getAdminToken(mode?: PortalMode): string | null {
  const resolvedMode = mode ?? getPortalMode()
  if (adminToken && activePortalMode === resolvedMode) return adminToken
  if (typeof window !== 'undefined') return sessionStorage.getItem(getTokenStorageKey(resolvedMode))
  return null
}

export function clearAdminToken(mode?: PortalMode) {
  const resolvedMode = mode ?? getPortalMode()
  if (activePortalMode === resolvedMode) {
    adminToken = null
  }
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(getTokenStorageKey(resolvedMode))
    if (sessionStorage.getItem(PORTAL_MODE_KEY) === resolvedMode) {
      sessionStorage.removeItem(PORTAL_MODE_KEY)
    }
  }
}

export type AdminSession = {
  id: string
  name: string
  email: string
  role: string
  role_id?: string | null
  celebrity_id?: string | null
  is_active?: boolean
  must_change_password?: boolean
  profile_completed?: boolean
  celebrity?: {
    id: string
    name: string
    onboarding_status?: string
    thumbnail_url?: string | null
  } | null
}

export type CelebrityApplication = {
  id: string
  name: string
  industry: string
  nationality: string
  region?: string | null
  contact_email?: string | null
  contact_phone?: string | null
  languages: string[]
  bio?: string | null
  onboarding_status: 'pending_review' | 'approved' | 'rejected'
  applied_at: string
  reviewed_at?: string | null
  review_notes?: string | null
  is_active: boolean
  portal_admin?: { id: string; email: string; is_active: boolean } | null
  reviewed_by?: { id: string; name: string; email: string } | null
}

export type CelebrityPortalTemplate = {
  id: string
  name: string
  purpose: string
  product_types: string[]
  duration: string
}

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const mode = getPortalMode()
  const token = getAdminToken(mode)
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers || {}),
    },
  })
  if (res.status === 401 && getAdminToken(mode)) {
    clearAdminToken(mode)
    if (typeof window !== 'undefined')
    throw new Error('Session expired')
  }
  if (res.status === 429) throw new Error('Too many attempts. Please wait a moment and try again.')
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Request failed')
  return data
}

export const adminApi = {
  login:           (body: object) => req('/admin/login', { method: 'POST', body: JSON.stringify(body) }),
  forgotPassword:  (body: object) => req('/admin/forgot-password', { method: 'POST', body: JSON.stringify(body) }),
  resetPassword:   (token: string, body: object) => req(`/admin/reset-password/${token}`, { method: 'POST', body: JSON.stringify(body) }),
  dashboard:      () => req('/admin/dashboard'),
  users:          (params = '') => req(`/admin/users?${params}`),
  updateUser:     (id: string, body: object) => req(`/admin/users/${id}/status`, { method: 'PATCH', body: JSON.stringify(body) }),

  celebrities:    (params = '') => req(`/admin/celebrities?${params}`),
  createCelebrityPortalAccess: (id: string) => req(`/admin/celebrities/${id}/portal-access`, { method: 'POST' }),
  createCeleb:    (body: object) => req('/celebrities', { method: 'POST', body: JSON.stringify(body) }),
  updateCeleb:    (id: string, body: object) => req(`/celebrities/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  toggleCeleb:    (id: string) => req(`/celebrities/${id}/toggle`, { method: 'PATCH' }),
  cloneVoice:     (id: string, formData: FormData) => {
    const mode = getPortalMode()
    const token = getAdminToken(mode)
    return fetch(`${BASE}/celebrities/${id}/clone-voice`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    }).then(async res => {
      if (res.status === 401) { clearAdminToken(mode); throw new Error('Session expired') }
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Request failed')
      return data
    })
  },
  deleteCeleb:    (id: string) => req(`/celebrities/${id}`, { method: 'DELETE' }),

  jobs:           (params = '') => req(`/jobs/admin?${params}`),
  celebrityJobs:  (params = '') => req(`/jobs/celebrity/my${params ? `?${params}` : ''}`),
  updateJobStatus:(id: string, body: object) => req(`/jobs/admin/${id}/status`, { method: 'PATCH', body: JSON.stringify(body) }),
  approveJob:     (id: string) => req(`/jobs/admin/${id}/approve`, { method: 'POST' }),
  rejectJob:      (id: string, note: string) => req(`/jobs/admin/${id}/reject`, { method: 'POST', body: JSON.stringify({ note }) }),
  enableDownload: (id: string) => req(`/jobs/admin/${id}/enable-download`, { method: 'PATCH' }),

  leads:          (params = '') => req(`/leads/admin?${params}`),
  leadStats:      () => req('/leads/admin/stats'),
  getLead:        (id: string) => req(`/leads/admin/${id}`),
  updateLead:     (id: string, body: object) => req(`/leads/admin/${id}/status`, { method: 'PATCH', body: JSON.stringify(body) }),

  me:             () => req<{ success: boolean; data: AdminSession; permissions: string[] }>('/admin/me'),
  celebrityApplications: (params = '') => req<{ success: boolean; data: CelebrityApplication[]; total: number; page: number; pages: number }>(`/admin/celebrity-applications${params ? `?${params}` : ''}`),
  approveCelebrityApplication: (id: string) => req(`/admin/celebrity-applications/${id}/approve`, { method: 'POST' }),
  rejectCelebrityApplication: (id: string, note: string) => req(`/admin/celebrity-applications/${id}/reject`, { method: 'POST', body: JSON.stringify({ note }) }),
  getMyCelebrityProfile: () => req<{ success: boolean; data: Record<string, unknown>; templates: CelebrityPortalTemplate[] }>('/admin/celebrity/profile'),
  saveMyCelebrityProfile: (body: object) => req('/admin/celebrity/profile', { method: 'PUT', body: JSON.stringify(body) }),

  getSettings:    () => req('/admin/settings'),
  saveSettings:   (body: object) => req('/admin/settings', { method: 'PUT', body: JSON.stringify(body) }),
  uploadWatermarkImage: (formData: FormData) => {
    const mode = getPortalMode()
    const token = getAdminToken(mode)
    return fetch(`${BASE}/admin/settings/watermark-image`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    }).then(async res => {
      if (res.status === 401) { clearAdminToken(mode); throw new Error('Session expired') }
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Request failed')
      return data
    })
  },
  deleteWatermarkImage: () => req('/admin/settings/watermark-image', { method: 'DELETE' }),

  getBlockedWords:   () => req('/admin/settings/blocked-words'),
  addBlockedWord:    (words: string[]) => req('/admin/settings/blocked-words', { method: 'POST', body: JSON.stringify({ words }) }),
  removeBlockedWord: (word: string) => req(`/admin/settings/blocked-words/${encodeURIComponent(word)}`, { method: 'DELETE' }),

  roles:          () => req('/admin/roles'),
  createRole:     (body: object) => req('/admin/roles', { method: 'POST', body: JSON.stringify(body) }),
  updateRole:     (id: string, body: object) => req(`/admin/roles/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteRole:     (id: string) => req(`/admin/roles/${id}`, { method: 'DELETE' }),

  team:           () => req('/admin/team'),
  createMember:   (body: object) => req('/admin/team', { method: 'POST', body: JSON.stringify(body) }),
  updateMember:   (id: string, body: object) => req(`/admin/team/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteMember:   (id: string) => req(`/admin/team/${id}`, { method: 'DELETE' }),

  templates:      (params = '') => req(`/templates/admin?${params}`),
  createTemplate: (body: object) => req('/templates', { method: 'POST', body: JSON.stringify(body) }),
  updateTemplate: (id: string, body: object) => req(`/templates/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  toggleTemplate: (id: string) => req(`/templates/${id}/toggle`, { method: 'PATCH' }),
  deleteTemplate: (id: string) => req(`/templates/${id}`, { method: 'DELETE' }),

  productTypes:       () => req('/product-types/admin'),
  createProductType:  (body: object) => req('/product-types', { method: 'POST', body: JSON.stringify(body) }),
  updateProductType:  (id: string, body: object) => req(`/product-types/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  toggleProductType:  (id: string) => req(`/product-types/${id}/toggle`, { method: 'PATCH' }),
  deleteProductType:  (id: string) => req(`/product-types/${id}`, { method: 'DELETE' }),
}
