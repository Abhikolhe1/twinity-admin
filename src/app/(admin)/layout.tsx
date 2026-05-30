'use client'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import TopBar from '@/components/layout/TopBar'
import Link from 'next/link'
import { adminApi, getAdminToken, getPortalMode, type AdminSession } from '@/lib/api'
import { PermissionsContext } from '@/lib/permissions-context'

const ROUTE_PERMISSIONS: { prefix: string; permission: string }[] = [
  { prefix: '/celebrity/profile', permission: 'celebrity.profile.view' },
  { prefix: '/celebrity/orders',  permission: 'celebrity.orders.view' },
  { prefix: '/celebrity-applications', permission: 'celebrity_applications.view' },
  { prefix: '/customers',          permission: 'users.view' },
  { prefix: '/celebrities',        permission: 'celebrities.view' },
  { prefix: '/videos',             permission: 'videos.view' },
  { prefix: '/refunds',            permission: 'videos.view' },
  { prefix: '/leads',              permission: 'leads.view' },
  { prefix: '/templates',          permission: 'templates.view' },
  { prefix: '/manager/dashboard',  permission: 'manager.dashboard.view' },
  { prefix: '/manager/requests',   permission: 'manager.dashboard.view' },
  { prefix: '/team',               permission: 'team.view' },
  { prefix: '/roles',              permission: 'roles.view' },
  { prefix: '/settings',           permission: 'settings.view' },
  { prefix: '/audit-logs',         permission: 'audit_logs.view' },
  { prefix: '/celebrity-managers', permission: 'celebrity_managers.view' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [permissions, setPermissions] = useState<string[]>([])
  const [adminData, setAdminData] = useState<AdminSession | null>(null)
  const [ready, setReady] = useState(false)

  const loginHref = getPortalMode() === 'celebrity' ? '/celebrity-login' : getPortalMode() === 'manager' ? '/manager-login' : '/login'

  useEffect(() => {
    if (!getAdminToken()) { router.replace(loginHref); return }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    adminApi.me().then((res) => {
      setAdminData(res.data)
      setPermissions(res.permissions ?? [])
      setReady(true)
    }).catch(() => {
      // Only redirect to login if the token was cleared (genuine 401 / session expired).
      // For network errors the token stays intact — redirecting would cause a loop
      // because the login page would immediately redirect back here.
      if (!getAdminToken()) {
        router.replace(loginHref)
      } else {
        // Server unreachable but token looks valid — show the UI with no permissions
        setReady(true)
      }
    })
  }, [loginHref, router])

  useEffect(() => {
    if (!ready) return
    const isCelebrityPortal = Boolean(adminData?.celebrity_id)
    if (pathname === '/') {
      if (isCelebrityPortal) {
        router.replace('/celebrity/profile')
        return
      }
      if (!permissions.includes('dashboard.view')) {
        const fallback = ROUTE_PERMISSIONS.find(r => permissions.includes(r.permission))
        if (fallback) router.replace(fallback.prefix)
        return
      }
    }
    const rule = ROUTE_PERMISSIONS.find(r => pathname.startsWith(r.prefix))
    if (rule && !permissions.includes(rule.permission)) router.replace('/')
  }, [ready, permissions, pathname, router, adminData])

  if (!ready) return null

  const showProfileGate = Boolean(
    adminData?.celebrity_id &&
    !adminData.profile_completed &&
    pathname !== '/celebrity/profile'
  )

  return (
    <PermissionsContext.Provider value={permissions}>
      <div className="flex min-h-screen bg-surface-page">
        {showProfileGate && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border border-brand-purple/15 bg-white p-7 shadow-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-purple">Complete Profile</p>
              <h2 className="mt-2 text-2xl font-bold text-content-primary">Finish your celebrity profile</h2>
              <p className="mt-3 text-sm leading-6 text-content-muted">
                Complete your profile to unlock the full celebrity portal. We need your public bio, localized details, and profile image before you can access the rest of the workspace.
              </p>
              <div className="mt-6 flex items-center justify-end gap-3">
                <Link
                  href="/celebrity/profile"
                  className="inline-flex rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg,#9a78fe,#422266)' }}
                >
                  Complete Now
                </Link>
              </div>
            </div>
          </div>
        )}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <Sidebar
          open={sidebarOpen}
          collapsed={sidebarCollapsed}
          onClose={() => setSidebarOpen(false)}
        />
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <TopBar
            sidebarOpen={sidebarOpen}
            sidebarCollapsed={sidebarCollapsed}
            onMobileToggle={() => setSidebarOpen(v => !v)}
            onDesktopToggle={() => setSidebarCollapsed(v => !v)}
          />
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </PermissionsContext.Provider>
  )
}
