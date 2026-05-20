// app/components/Navbar.tsx
'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

type UserRole = 'ADMIN' | 'MANAGER' | 'SALES';

type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
};

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/':                 { title: 'Business Dashboard',   subtitle: 'Real-time sales, inventory and AI analytics overview' },
  '/product_page':     { title: 'Products',             subtitle: 'View and manage your product catalog' },
  '/product_add':      { title: 'Update Product',       subtitle: 'Add new products or update stock and pricing' },
  '/sale_page':        { title: 'Sales',                subtitle: 'Sales analytics and performance overview' },
  '/sale_entry':       { title: 'Sale Entry',           subtitle: 'Record new sales and update inventory' },
  '/inventory_alerts': { title: 'Inventory Alerts',     subtitle: 'Monitor stock levels and set alert limits' },
  '/expenses':         { title: 'Expense Tracking',     subtitle: 'Track and manage business expenses' },
  '/analytics_page':   { title: 'Advanced Analytics',   subtitle: 'Revenue, profit, employee and heatmap insights' },
  '/forecast':         { title: 'AI Forecasting',       subtitle: 'AI-powered sales and revenue predictions' },
  '/report_page':      { title: 'Reports',              subtitle: 'Generate and export business reports' },
  '/anomaly':          { title: 'Anomaly Detection',    subtitle: 'Detect unusual sales and expense patterns' },
  '/user_management':  { title: 'User Management',      subtitle: 'Manage accounts and roles' },
};

const roleBg: Record<UserRole, string> = {
  ADMIN:   'bg-rose-500',
  MANAGER: 'bg-blue-500',
  SALES:   'bg-emerald-500',
};

const getCurrentDate = () => {
  return new Date().toLocaleDateString('en-BD', {
    timeZone: 'Asia/Dhaka',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export default function Navbar() {
  const pathname = usePathname();
  const [user, setUser]           = useState<AuthUser | null>(null);
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => setUser(d.success ? d.user : null))
      .catch(() => setUser(null));
    setCurrentDate(getCurrentDate());
  }, []);

  const page = PAGE_TITLES[pathname] ?? {
    title:    'Smart Retail Business',
    subtitle: 'Business Intelligence Platform',
  };

  return (
    <header className="sticky top-0 z-20 backdrop-blur-xl bg-white/5 border-b border-white/10 shadow-sm">
      <div className="flex items-center justify-between px-4 py-4 md:px-6 lg:px-8
                      pl-16 lg:pl-8">
        {/* pl-16 on mobile = space for hamburger button */}

        {/* Page title */}
        <div className="min-w-0">
          <h2 className="text-lg font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent truncate
                         md:text-xl">
            {page.title}
          </h2>
          {/* subtitle hidden on very small screens */}
          <p className="text-xs text-slate-400/90 truncate hidden sm:block
                        md:text-sm">
            {page.subtitle}
          </p>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 md:gap-4 flex-shrink-0 ml-3">

          {/* Date — hidden on mobile to save space */}
          <div className="hidden md:flex rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 backdrop-blur-sm">
            📅 {currentDate || 'Loading...'}
          </div>

          {/* User profile */}
          <div className="flex items-center gap-2 md:gap-3 rounded-full border border-white/20 bg-white/5 px-3 py-2 md:px-4 backdrop-blur-sm">
            <div className={`flex h-8 w-8 md:h-9 md:w-9 items-center justify-center rounded-full font-bold text-white shadow-md flex-shrink-0 ${
              user ? roleBg[user.role] : 'bg-slate-600'
            }`}>
              {user?.name?.[0]?.toUpperCase() ?? '?'}
            </div>
            {/* Name + role — hidden on small mobile */}
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-slate-100">{user?.name ?? 'Loading...'}</p>
              <p className="text-xs text-slate-400">{user?.role ?? '—'}</p>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
}