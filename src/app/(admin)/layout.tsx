'use client'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import TopBar from '@/components/layout/TopBar'
import { getAdminToken, adminApi } from '@/lib/api'
import { PermissionsContext } from '@/lib/permissions-context'

const ROUTE_PERMISSIONS: { prefix: string; permission: string }[] = [
  { prefix: '/customers',   permission: 'users.view' },
  { prefix: '/celebrities', permission: 'celebrities.view' },
  { prefix: '/videos',      permission: 'videos.view' },
  { prefix: '/leads',       permission: 'leads.view' },
  { prefix: '/templates',   permission: 'templates.view' },
  { prefix: '/team',        permission: 'team.view' },
  { prefix: '/roles',       permission: 'roles.view' },
  { prefix: '/settings',    permission: 'settings.view' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [permissions, setPermissions] = useState<string[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!getAdminToken()) { router.replace('/login'); return }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    adminApi.me().then((res: any) => {
      setPermissions(res.permissions ?? [])
      setReady(true)
    }).catch(() => {
      // Only redirect to login if the token was cleared (genuine 401 / session expired).
      // For network errors the token stays intact — redirecting would cause a loop
      // because the login page would immediately redirect back here.
      if (!getAdminToken()) {
        router.replace('/login')
      } else {
        // Server unreachable but token looks valid — show the UI with no permissions
        setReady(true)
      }
    })
  }, [router])

  useEffect(() => {
    if (!ready) return
    const rule = ROUTE_PERMISSIONS.find(r => pathname.startsWith(r.prefix))
    if (rule && !permissions.includes(rule.permission)) router.replace('/')
  }, [ready, permissions, pathname, router])

  if (!ready) return null

  return (
    <PermissionsContext.Provider value={permissions}>
      <div className="flex min-h-screen bg-surface-page">
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
