'use client'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Users, Star, Film, PhoneCall, Settings, LogOut, ShieldCheck, Users2, FileText, ShieldAlert, Layers, ClipboardList, UserCircle2, Link2, ScrollText, RefreshCw } from 'lucide-react'
import { clearAdminToken, getPortalMode } from '@/lib/api'
import { usePermissions } from '@/lib/permissions-context'

const NAV = [
  { href: '/',            label: 'Dashboard',   icon: LayoutDashboard, permission: 'dashboard.view' },
  { href: '/customers',   label: 'Customers',   icon: Users,           permission: 'users.view' },
  { href: '/celebrities', label: 'Celebrities', icon: Star,            permission: 'celebrities.view' },
  { href: '/videos',      label: 'Video Jobs',  icon: Film,            permission: 'videos.view' },
  { href: '/videos/revisions', label: 'Revisions',  icon: RefreshCw,  permission: 'videos.view' },
  { href: '/leads',       label: 'Leads / CRM', icon: PhoneCall,       permission: 'leads.view' },
  { href: '/templates',     label: 'Templates',     icon: FileText, permission: 'templates.view' },
  { href: '/product-types', label: 'Product Types', icon: Layers,   permission: 'settings.view' },
  { href: '/celebrity-applications', label: 'Applications', icon: ClipboardList, permission: 'celebrity_applications.view' },
  { href: '/celebrity/profile',      label: 'My Profile',   icon: UserCircle2,   permission: 'celebrity.profile.view' },
  { href: '/celebrity/orders',       label: 'My Orders',    icon: Film,          permission: 'celebrity.orders.view' },
]

const ADMIN_NAV = [
  { href: '/team',                label: 'Team',               icon: Users2,      permission: 'team.view' },
  { href: '/roles',               label: 'Roles',              icon: ShieldCheck, permission: 'roles.view' },
  { href: '/celebrity-managers',  label: 'Celeb. Managers',   icon: Link2,       permission: 'celebrity_managers.view' },
  { href: '/audit-logs',          label: 'Audit Logs',         icon: ScrollText,  permission: 'audit_logs.view' },
  { href: '/blocked-words',       label: 'Blocked Words',      icon: ShieldAlert, permission: 'settings.manage' },
  { href: '/settings',            label: 'Settings',           icon: Settings,    permission: 'settings.view' },
]

interface SidebarProps {
  open: boolean
  collapsed: boolean
  onClose: () => void
}

export default function Sidebar({ open, collapsed, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const permissions = usePermissions()

  const visibleNav = NAV.filter(item => permissions.includes(item.permission))
  const visibleAdminNav = ADMIN_NAV.filter(item => permissions.includes(item.permission))

  function logout() {
    clearAdminToken()
    router.push(getPortalMode() === 'celebrity' ? '/celebrity-login' : '/login')
  }

  return (
    <aside
      className={[
        'fixed lg:relative inset-y-0 left-0 z-30',
        'flex flex-col bg-white border-r border-brand-purple/10 shadow-sm',
        'transition-all duration-300 min-h-screen shrink-0',
        open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        collapsed ? 'lg:w-16 w-56' : 'w-56',
      ].join(' ')}
    >
      {/* Logo */}
      <div className="px-3 py-3 border-b border-brand-purple/8 flex items-center min-h-[56px]">
        {collapsed ? (
          <div className="mx-auto flex items-center justify-center w-8 h-8">
            <Image src="/logo/icon.svg" alt="Twinity" width={32} height={32} />
          </div>
        ) : (
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="shrink-0 w-8 h-8">
              <Image src="/logo/icon.svg" alt="Twinity" width={32} height={32} />
            </div>
            <div className="leading-none">
              <p className="text-content-primary font-bold text-sm">Twinity</p>
              <p className="text-content-muted text-[10px] mt-0.5">Admin Panel</p>
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 flex flex-col gap-0.5 overflow-y-auto">
        {!collapsed && (
          <p className="text-[10px] font-semibold text-content-muted uppercase tracking-widest px-3 mb-2">
            Navigation
          </p>
        )}
        {visibleNav.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              onClick={onClose}
              className={[
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                collapsed ? 'justify-center' : '',
                active
                  ? 'bg-surface-subtle text-brand-purple'
                  : 'text-content-secondary hover:text-brand-purple hover:bg-surface-subtle',
              ].join(' ')}
            >
              <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-brand-purple' : ''}`} />
              {!collapsed && label}
            </Link>
          )
        })}

        {/* Administration section */}
        {visibleAdminNav.length > 0 && !collapsed && (
          <p className="text-[10px] font-semibold text-content-muted uppercase tracking-widest px-3 mb-2 mt-4">
            Administration
          </p>
        )}
        {visibleAdminNav.length > 0 && collapsed && <div className="my-2 mx-2 border-t border-brand-purple/8" />}
        {visibleAdminNav.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              onClick={onClose}
              className={[
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                collapsed ? 'justify-center' : '',
                active
                  ? 'bg-surface-subtle text-brand-purple'
                  : 'text-content-secondary hover:text-brand-purple hover:bg-surface-subtle',
              ].join(' ')}
            >
              <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-brand-purple' : ''}`} />
              {!collapsed && label}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="px-2 pb-4 border-t border-brand-purple/8 pt-3">
        <button
          onClick={logout}
          title={collapsed ? 'Logout' : undefined}
          className={[
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium',
            'text-content-muted hover:text-brand-purple hover:bg-surface-subtle transition-all',
            collapsed ? 'justify-center' : '',
          ].join(' ')}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && 'Logout'}
        </button>
      </div>
    </aside>
  )
}
