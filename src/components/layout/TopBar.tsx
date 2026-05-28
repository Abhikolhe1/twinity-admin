'use client'
import { usePathname, useRouter } from 'next/navigation'
import { Bell, LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { clearAdminToken, getPortalMode } from '@/lib/api'

const TITLES: Record<string, string> = {
  '/':            'Dashboard',
  '/users':       'Users',
  '/celebrities': 'Celebrities',
  '/videos':      'Video Jobs',
  '/leads':       'Leads / CRM',
  '/settings':    'Settings',
  '/team':        'Team',
  '/roles':       'Roles',
  '/celebrity-applications': 'Celebrity Applications',
  '/celebrity/profile': 'My Profile',
  '/celebrity/orders': 'My Orders',
}

interface TopBarProps {
  sidebarOpen: boolean
  sidebarCollapsed: boolean
  onMobileToggle: () => void
  onDesktopToggle: () => void
}

export default function TopBar({ sidebarOpen, sidebarCollapsed, onMobileToggle, onDesktopToggle }: TopBarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const title = TITLES[pathname] ?? 'Admin'

  function logout() {
    clearAdminToken()
    router.push(getPortalMode() === 'celebrity' ? '/celebrity-login' : '/login')
  }

  return (
    <header className="h-14 bg-white/90 backdrop-blur-xl border-b border-brand-purple/10 px-4 flex items-center justify-between sticky top-0 z-10 shrink-0">
      <div className="flex items-center gap-3">
        {/* Mobile toggle */}
        <button
          onClick={onMobileToggle}
          title={sidebarOpen ? 'Close menu' : 'Open menu'}
          className="lg:hidden w-8 h-8 rounded-xl flex items-center justify-center text-content-muted hover:text-brand-purple hover:bg-surface-subtle transition-all"
        >
          {sidebarOpen
            ? <PanelLeftClose className="w-4 h-4" />
            : <PanelLeftOpen className="w-4 h-4" />
          }
        </button>

        {/* Desktop toggle */}
        <button
          onClick={onDesktopToggle}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="hidden lg:flex w-8 h-8 rounded-xl items-center justify-center text-content-muted hover:text-brand-purple hover:bg-surface-subtle transition-all"
        >
          {sidebarCollapsed
            ? <PanelLeftOpen className="w-4 h-4" />
            : <PanelLeftClose className="w-4 h-4" />
          }
        </button>

        <h2 className="text-sm font-semibold text-content-primary">{title}</h2>
      </div>

      <div className="flex items-center gap-2">
        <button
          className="relative w-8 h-8 rounded-xl flex items-center justify-center text-content-muted hover:text-brand-purple hover:bg-surface-subtle transition-all"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-brand-purple" />
        </button>

        <button
          onClick={logout}
          title="Logout"
          className="w-8 h-8 rounded-xl flex items-center justify-center text-content-muted hover:text-brand-purple hover:bg-surface-subtle transition-all"
        >
          <LogOut className="w-4 h-4" />
        </button>

        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0"
          style={{ background: 'linear-gradient(135deg,#9a78fe,#422266)' }}
        >
          A
        </div>
      </div>
    </header>
  )
}
