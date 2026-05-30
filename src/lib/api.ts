const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'

let adminToken: string | null = null
let activePortalMode: PortalMode = 'admin'

export type PortalMode = 'admin' | 'celebrity' | 'manager'

const PORTAL_MODE_KEY = 'twinity_portal_mode'
const TOKEN_KEY_PREFIX = 'twinity_portal_token_'

function normalizePortalMode(value?: string | null): PortalMode {
  if (value === 'celebrity' || value === 'manager') return value
  return 'admin'
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
  role?: string
  role_id?: string | null
  celebrity_id?: string | null
  manager_id?: string | null
  is_active?: boolean
  must_change_password?: boolean
  profile_completed?: boolean
  agency_name?: string | null
  phone?: string | null
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

export type ManagerDashboardOverview = {
  summary: {
    totalCelebrities: number
    totalRequests: number
    pendingRequests: number
    reviewRequests: number
    breachedRequests: number
    fastTrackRequests: number
  }
  portfolio: Array<{
    id: string
    name: string
    industry: string
    is_active: boolean
    onboarding_status: string
    total_orders: number
    thumbnail_url?: string | null
    pendingCount: number
    reviewCount: number
    deliveredCount: number
    breachedCount: number
    slaHours: number
    preapprovedTemplateCount: number
  }>
  alerts: Array<{
    referenceId: string
    celebrityId: string
    celebrityName: string
    purpose: string
    status: string
    approvalPath?: string | null
    slaHours: number
    slaState: 'due_soon' | 'breached'
    createdAt: string
  }>
}

export type ManagerDashboardRequest = {
  id: string
  reference_id: string
  celebrity_id: string
  product_type: string
  purpose: string
  status: string
  approval_path?: string | null
  estimated_price: number
  currency: string
  created_at: string
  updated_at: string
  delivered_at?: string | null
  celebrity?: {
    id: string
    name: string
    thumbnail_url?: string | null
  }
  user?: {
    id: string
    name: string
    email: string
    company?: string | null
  }
  slaHours: number
  slaState: 'on_track' | 'due_soon' | 'breached' | 'completed'
  slaDueAt: string
}

export type ManagerDashboardTemplate = {
  id: string
  name: string
  purpose: string
  duration: string
  product_types: string[]
}

export type ManagerDashboardCelebrityTemplates = {
  id: string
  name: string
  industry: string
  is_active: boolean
  onboarding_status: string
  total_orders: number
  thumbnail_url?: string | null
  slaHours: number
  preapproved_template_ids: string[]
  preapprovedTemplates: ManagerDashboardTemplate[]
}

export type AdminRefundRequest = {
  id: string
  status: 'requested' | 'approved' | 'rejected' | 'processed' | 'partial'
  reason: string
  requested_amount?: number | null
  approved_amount?: number | null
  currency: string
  admin_note?: string | null
  requested_at: string
  decision_at?: string | null
  processed_at?: string | null
  payment_gateway?: string | null
  payment_reference?: string | null
  user: { id: string; name: string; email: string }
  decision_admin?: { id: string; name: string; email: string } | null
  video_job: {
    id: string
    reference_id: string
    status: string
    estimated_price: number
    currency: string
    purpose: string
    product_type: string
    created_at: string
    error_message?: string | null
    celebrity: { id: string; name: string }
    user: { id: string; name: string; email: string }
  }
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
  const data = await res.json().catch(() => ({})) as any
  if (res.status === 429) throw new Error(data.message || 'Too many attempts. Please wait a moment and try again.')
  if (!res.ok) throw new Error(data.message || 'Request failed')
  return data
}

function getAuthPrefix(mode: PortalMode): '/admin' | '/manager' {
  return mode === 'manager' ? '/manager' : '/admin'
}

function getDashboardPrefix(mode: PortalMode): '/manager/dashboard' | '/admin/manager-dashboard' {
  return mode === 'manager' ? '/manager/dashboard' : '/admin/manager-dashboard'
}

export const adminApi = {
  login: (body: object, _mode?: PortalMode) => req(`/admin/login`, { method: 'POST', body: JSON.stringify(body) }),
  forgotPassword: (body: { email: string }, _mode?: PortalMode) => req(`/admin/forgot-password`, { method: 'POST', body: JSON.stringify(body) }),
  resetPassword:   (token: string, body: object, mode: PortalMode = getPortalMode()) => req(`${getAuthPrefix(mode)}/reset-password/${token}`, { method: 'POST', body: JSON.stringify(body) }),
  dashboard:      () => req('/admin/dashboard'),
  users:          (params = '') => req(`/admin/users?${params}`),
  getUser:        (id: string) => req(`/admin/users/${id}`),
  updateUser:     (id: string, body: object) => req(`/admin/users/${id}/status`, { method: 'PATCH', body: JSON.stringify(body) }),
  getUserAuditLogs: (id: string, params = '') => req(`/admin/users/${id}/audit-logs?${params}`),
  auditLogs:      (params = '') => req(`/admin/audit-logs?${params}`),

  managerLinks:         (params = '') => req(`/admin/celebrity-managers?${params}`),
  getCelebrityManagers: (celebrityId: string) => req(`/admin/celebrity-managers/${celebrityId}/managers`),
  addCelebrityManager:  (celebrityId: string, body: object) => req(`/admin/celebrity-managers/${celebrityId}/managers`, { method: 'POST', body: JSON.stringify(body) }),
  updateCelebrityManager: (celebrityId: string, linkId: string, body: object) => req(`/admin/celebrity-managers/${celebrityId}/managers/${linkId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  removeCelebrityManager: (celebrityId: string, linkId: string) => req(`/admin/celebrity-managers/${celebrityId}/managers/${linkId}`, { method: 'DELETE' }),

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
  revisions:      (params = '') => req(`/jobs/admin/revisions?${params}`),
  setPreviewUrl:  (id: string, watermarked_url: string) => req(`/jobs/admin/${id}/set-preview`, { method: 'POST', body: JSON.stringify({ watermarked_url }) }),
  refunds:        (params = '') => req<{ success: boolean; data: AdminRefundRequest[]; total: number }>(`/jobs/admin/refunds${params ? `?${params}` : ''}`),
  getRefund:      (id: string) => req<{ success: boolean; data: AdminRefundRequest }>(`/jobs/admin/refunds/${id}`),
  approveRefund:  (id: string, body: { approvedAmount?: number; note?: string }) => req<{ success: boolean; data: AdminRefundRequest }>(`/jobs/admin/refunds/${id}/approve`, { method: 'POST', body: JSON.stringify(body) }),
  rejectRefund:   (id: string, note: string) => req<{ success: boolean; data: AdminRefundRequest }>(`/jobs/admin/refunds/${id}/reject`, { method: 'POST', body: JSON.stringify({ note }) }),
  processRefund:  (id: string, body: { paymentGateway?: string; paymentReference?: string; note?: string }) => req<{ success: boolean; data: AdminRefundRequest }>(`/jobs/admin/refunds/${id}/process`, { method: 'POST', body: JSON.stringify(body) }),
  celebrityJobs:  (params = '') => req(`/jobs/celebrity/my${params ? `?${params}` : ''}`),
  celebrityApproveJob: (id: string) => req(`/jobs/celebrity/my/${id}/approve`, { method: 'POST' }),
  celebrityRejectJob: (id: string, note: string) => req(`/jobs/celebrity/my/${id}/reject`, { method: 'POST', body: JSON.stringify({ note }) }),
  updateJobStatus:(id: string, body: object) => req(`/jobs/admin/${id}/status`, { method: 'PATCH', body: JSON.stringify(body) }),
  approveJob:     (id: string) => req(`/jobs/admin/${id}/approve`, { method: 'POST' }),
  rejectJob:      (id: string, note: string) => req(`/jobs/admin/${id}/reject`, { method: 'POST', body: JSON.stringify({ note }) }),
  managerApproveJob: (id: string) => req(`/jobs/manager/${id}/approve`, { method: 'POST' }),
  managerRejectJob: (id: string, note: string) => req(`/jobs/manager/${id}/reject`, { method: 'POST', body: JSON.stringify({ note }) }),
  enableDownload: (id: string) => req(`/jobs/admin/${id}/enable-download`, { method: 'PATCH' }),

  leads:          (params = '') => req(`/leads/admin?${params}`),
  leadStats:      () => req('/leads/admin/stats'),
  getLead:        (id: string) => req(`/leads/admin/${id}`),
  updateLead:     (id: string, body: object) => req(`/leads/admin/${id}/status`, { method: 'PATCH', body: JSON.stringify(body) }),

  me:             (mode: PortalMode = getPortalMode()) => req<{ success: boolean; data: AdminSession; permissions: string[] }>(`${getAuthPrefix(mode)}/me`),
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

  managers:       () => req<{ success: boolean; data: Array<AdminSession & { celebrity_links?: Array<{ celebrity: { id: string; name: string }; permissions: string[] }> }> }>('/admin/celebrity-managers/managers'),
  createManager:  (body: object) => req('/admin/celebrity-managers/managers', { method: 'POST', body: JSON.stringify(body) }),
  managerDashboardOverview: (mode: PortalMode = getPortalMode()) => req<{ success: boolean } & ManagerDashboardOverview>(`${getDashboardPrefix(mode)}/overview`),
  managerDashboardRequests: (params = '', mode: PortalMode = getPortalMode()) => req<{ success: boolean; data: ManagerDashboardRequest[]; total: number; page: number; pages: number }>(`${getDashboardPrefix(mode)}/requests${params ? `?${params}` : ''}`),
  managerDashboardTemplates: (mode: PortalMode = getPortalMode()) => req<{ success: boolean; data: ManagerDashboardCelebrityTemplates[]; templates: ManagerDashboardTemplate[] }>(`${getDashboardPrefix(mode)}/templates`),
  updateManagerDashboardTemplates: (celebrityId: string, templateIds: string[], mode: PortalMode = getPortalMode()) => req(`${getDashboardPrefix(mode)}/templates/${celebrityId}`, { method: 'PATCH', body: JSON.stringify({ templateIds }) }),
  managerDashboardAuditLogs: (params = '', mode: PortalMode = getPortalMode()) => req<{ success: boolean; logs: any[]; total: number; page: number; pages: number }>(`${getDashboardPrefix(mode)}/audit-logs${params ? `?${params}` : ''}`),

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
