'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type UserRole = 'ADMIN' | 'MANAGER' | 'SALES';

type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
};

const allLinks = [
  { name: 'Dashboard',         href: '/',                 icon: '🏠', roles: ['ADMIN', 'MANAGER', 'SALES'] },
  { name: 'Products',          href: '/product_page',     icon: '📦', roles: ['ADMIN', 'MANAGER'] },
  { name: 'Update Product',    href: '/product_add',      icon: '✏️',  roles: ['ADMIN', 'MANAGER'] },
  { name: 'Sales',             href: '/sale_page',        icon: '📊', roles: ['ADMIN', 'MANAGER'] },
  { name: 'Sale Entry',        href: '/sale_entry',       icon: '🧾', roles: ['ADMIN', 'MANAGER', 'SALES'] },
  { name: 'Inventory Alerts',  href: '/inventory_alerts', icon: '🔔', roles: ['ADMIN', 'MANAGER'] },
  { name: 'Expense Tracking',  href: '/expenses',         icon: '💸', roles: ['ADMIN', 'MANAGER'] },
  { name: 'Analytics',         href: '/analytics_page',   icon: '📈', roles: ['ADMIN', 'MANAGER'] },
  { name: 'AI Forecasting',    href: '/forecast',         icon: '🤖', roles: ['ADMIN', 'MANAGER'] },
  { name: 'Reports',           href: '/report_page',      icon: '📋', roles: ['ADMIN', 'MANAGER'] },
  { name: 'Anomaly Detection', href: '/anomaly',          icon: '🚨', roles: ['ADMIN', 'MANAGER'] },
  { name: 'User Management',   href: '/user_management',  icon: '👥', roles: ['ADMIN'] },
];

const roleBadge: Record<UserRole, string> = {
  ADMIN:   'bg-rose-500/20 text-rose-300 border-rose-500/30',
  MANAGER: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  SALES:   'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
};

export default function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const [user,     setUser]     = useState<AuthUser | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => setUser(d.success ? d.user : null))
      .catch(() => setUser(null));
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const visibleLinks = user
    ? allLinks.filter(link => link.roles.includes(user.role))
    : [];

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Top gradient accent */}
      <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 flex-shrink-0" />

      {/* Brand */}
      <div className="px-6 pt-6 pb-5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold shadow-lg flex-shrink-0">
            SR
          </div>
          <div>
            <h1 className="text-xl font-bold text-white leading-tight">Smart Retail Business</h1>
            <p className="text-sm text-slate-500">Business Intelligence</p>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-6 h-px bg-white/5 flex-shrink-0" />

      {/* Nav label */}
      <p className="px-6 pt-6 pb-2 text-xs font-semibold uppercase tracking-widest text-slate-600 flex-shrink-0">
        Navigation
      </p>

      {/* Nav links */}
      <nav className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
        {visibleLinks.map(link => {
          const active     = pathname === link.href;
          const isForecast = link.href === '/forecast';
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-base font-semibold transition-all duration-150
                ${active
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : isForecast
                  ? 'text-purple-300 hover:bg-purple-500/10 hover:text-purple-200 border border-purple-500/20'
                  : 'text-slate-300 hover:bg-white/6 hover:text-white'
                }`}
            >
              <span className="text-lg leading-none">{link.icon}</span>
              <span className="flex-1">{link.name}</span>
              {isForecast && !active && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  AI
                </span>
              )}
              {active && <span className="w-2 h-2 rounded-full bg-white/80" />}
            </Link>
          );
        })}

        {/* Divider + logout */}
        <div className="mx-2 my-3 h-px bg-white/5" />
        <div className="pt-1">
          <div className="mb-2 flex items-center gap-2 px-1">
            <span className="text-sm font-medium text-slate-400 truncate">{user?.name ?? ''}</span>
            {user?.role && (
              <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${roleBadge[user.role]}`}>
                {user.role}
              </span>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-base font-semibold text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-150 border border-transparent hover:border-red-500/20"
          >
            <span className="text-lg">🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </nav>
    </div>
  );

  return (
    <>
      {/* ── DESKTOP SIDEBAR ── */}
      <aside
        className="hidden lg:flex flex-col bg-[#0f1117] border-r border-white/5 text-white flex-shrink-0"
        style={{ width: '288px', minWidth: '288px', height: '100vh', position: 'sticky', top: 0 }}
      >
        <SidebarContent />
      </aside>

      {/* ── MOBILE: hamburger button ── */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 w-10 h-10 rounded-xl bg-[#0f1117] border border-white/10 flex items-center justify-center text-white shadow-xl"
        aria-label="Open menu"
      >
        <span className="text-xl">☰</span>
      </button>

      {/* ── MOBILE: backdrop ── */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── MOBILE: slide-in drawer ── */}
      <aside
        className={`lg:hidden fixed top-0 left-0 z-50 h-full bg-[#0f1117] border-r border-white/5 text-white transition-transform duration-300 ease-in-out flex flex-col
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ width: '288px' }}
      >
        {/* Close button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition"
        >
          ✕
        </button>
        <SidebarContent />
      </aside>
    </>
  );
}