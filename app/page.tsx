'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Layout from '../components/Layout';
import Link   from 'next/link';

type Role = 'ADMIN' | 'MANAGER' | 'SALES';

interface DashData {
  user:   { id: number; name: string; role: Role };
  today:  { txn: number; revenue: number; units: number };
  month:  { txn: number; revenue: number; units: number; expenses: number; profit: number; revenueGrowth: number | null };
  stockAlerts:         { low: number; over: number };
  topProducts:         { name: string; units: number; revenue: number }[];
  employeeLeaderboard: { rank: number; name: string; revenue: number; units: number; txn: number }[];
  recentSales:         { id: number; product: string; quantity: number; total: number; employee: string; time: string }[];
  last6Months:         { month: string; revenue: number }[];
  myRank:              number | null;
  myRecentSales:       { id: number; product: string; quantity: number; total: number; time: string }[];
  myLast7Days:         { day: string; revenue: number; units: number }[];
  myTopProducts:       { name: string; units: number; revenue: number }[];
}

function bdt(n: number = 0): string {
  const sign = n < 0 ? '-' : '';
  const s    = Math.round(Math.abs(n)).toString();
  if (s.length <= 3) return `${sign}৳${s}`;
  const last3 = s.slice(-3);
  const rest  = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${sign}৳${rest},${last3}`;
}

function Sk({ h = 'h-28', w = 'w-full' }: { h?: string; w?: string }) {
  return <div className={`animate-pulse rounded-xl bg-white/5 ${h} ${w}`} />;
}

function KCard({ label, value, sub, icon, accent, growth }: {
  label: string; value: string; sub?: string;
  icon: string; accent: string; growth?: number | null;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border bg-[#0d1117] p-5"
         style={{ borderColor: `${accent}20` }}>
      <div className="pointer-events-none absolute -right-3 -top-3 h-16 w-16 rounded-full opacity-20 blur-2xl"
           style={{ background: accent }} />
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-black tracking-[0.2em] uppercase text-slate-600">{label}</span>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg text-base"
              style={{ background:`${accent}15`, color:accent }}>{icon}</span>
      </div>
      <div className="flex items-baseline gap-2 flex-wrap">
        <p className="text-xl font-black text-white leading-none">{value}</p>
        {growth != null && (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
            growth >= 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
          }`}>
            {growth >= 0 ? '▲' : '▼'} {Math.abs(growth).toFixed(1)}%
          </span>
        )}
      </div>
      {sub && <p className="mt-1.5 text-[11px] text-slate-600 truncate">{sub}</p>}
    </div>
  );
}

function MiniBar({ data, valueKey, labelKey, accent = '#22d3ee' }: {
  data: any[]; valueKey: string; labelKey: string; accent?: string;
}) {
  const max = Math.max(...data.map(d => d[valueKey]), 1);
  const BAR_AREA_HEIGHT = 160;
  return (
    <div className="w-full">
      <div className="relative w-full flex items-end gap-1" style={{ height: BAR_AREA_HEIGHT }}>
        {data.map((d, i) => {
          const barHeight = Math.max((d[valueKey] / max) * BAR_AREA_HEIGHT, 2);
          return (
            <div key={i} className="group relative flex-1 flex flex-col justify-end h-full">
              <div className="relative w-full flex justify-center">
                <div className="w-full rounded-t-sm transition-all duration-300"
                     style={{ height: `${barHeight}px`, background: `${accent}cc` }} />
                <div className="pointer-events-none absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-[10px] text-white border border-white/10 shadow-xl">
                  {bdt(d[valueKey])}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-1 mt-2">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center">
            <span className="text-[9px] text-slate-500 truncate block">{d[labelKey]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Card({ title, sub, children, className = '' }: {
  title: string; sub?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`rounded-xl border border-white/8 bg-[#0d1117] overflow-hidden ${className}`}>
      <div className="px-5 py-4 border-b border-white/6">
        <p className="text-sm font-bold text-white">{title}</p>
        {sub && <p className="text-[11px] text-slate-600 mt-0.5">{sub}</p>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Medal({ rank }: { rank: number }) {
  const cls =
    rank === 1 ? 'bg-yellow-400/20 text-yellow-400' :
    rank === 2 ? 'bg-slate-400/20 text-slate-300'   :
    rank === 3 ? 'bg-orange-400/20 text-orange-400' :
                 'bg-white/5 text-slate-600';
  return (
    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-lg text-[10px] font-black ${cls}`}>
      {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
    </span>
  );
}

// ── Auto-refresh indicator — no countdown prop needed, DOM ref used directly ──
function RefreshIndicator({ refreshing, domRef }: {
  refreshing: boolean;
  domRef: React.RefObject<HTMLSpanElement | null>;
}) {
  return (
    <div className="flex items-center gap-2 text-[10px] text-slate-600">
      {refreshing ? (
        <>
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          <span className="text-blue-400">Refreshing...</span>
        </>
      ) : (
        <>
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Auto-refresh in <span ref={domRef}>30</span>s</span>
        </>
      )}
    </div>
  );
}

const REFRESH_INTERVAL = 30; // seconds

export default function Dashboard() {
  const [data,       setData]       = useState<DashData | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  // countdown uses DOM ref → zero re-renders → no scroll reset
  const countdownDomRef = useRef<HTMLSpanElement | null>(null);
  const countdownValue  = useRef(REFRESH_INTERVAL);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else           setLoading(true);
    setError(null);
    try {
      const res  = await fetch('/api/dashboard');
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Failed to load');
      setData(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
      setRefreshing(false);
      countdownValue.current = REFRESH_INTERVAL;
      if (countdownDomRef.current) countdownDomRef.current.textContent = String(REFRESH_INTERVAL);
    }
  }, []);

  // Initial load
  useEffect(() => { fetchData(false); }, [fetchData]);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(() => fetchData(true), REFRESH_INTERVAL * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Countdown ticker — writes to DOM directly, zero React re-renders, no scroll reset
  useEffect(() => {
    const ticker = setInterval(() => {
      countdownValue.current = countdownValue.current <= 1 ? REFRESH_INTERVAL : countdownValue.current - 1;
      if (countdownDomRef.current) {
        countdownDomRef.current.textContent = String(countdownValue.current);
      }
    }, 1000);
    return () => clearInterval(ticker);
  }, []);

  const role          = data?.user?.role;
  const isManagerPlus = role === 'ADMIN' || role === 'MANAGER';
  const isSales       = role === 'SALES';

  const initials = data?.user?.name
    ?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() ?? '?';

  const roleColor =
    role === 'ADMIN'   ? 'from-rose-500 to-pink-600'   :
    role === 'MANAGER' ? 'from-blue-500 to-indigo-600' :
                         'from-emerald-500 to-teal-600';

  const hour  = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })).getHours();
  const greet = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <Layout>
      <div className="space-y-5">

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-400">
            ⚠️ {error}
          </div>
        )}

        {/* ── HEADER ── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            {loading ? <Sk h="h-12" w="w-12" /> : (
              <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${roleColor} flex items-center justify-center text-base font-black text-white flex-shrink-0`}>
                {initials}
              </div>
            )}
            <div>
              <p className="text-[10px] font-black tracking-[0.25em] uppercase text-slate-600">
                Smart Retail Business
              </p>
              {loading ? <Sk h="h-5" w="w-48" /> : (
                <h1 className="text-lg font-bold text-white">
                  {greet}, {data?.user?.name?.split(' ')[0]} 👋
                </h1>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Auto-refresh indicator */}
            {!loading && <RefreshIndicator refreshing={refreshing} domRef={countdownDomRef} />}

            {/* Manual refresh button */}
            {!loading && (
              <button
                onClick={() => fetchData(true)}
                disabled={refreshing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-400 hover:bg-white/10 hover:text-white transition disabled:opacity-40"
              >
                <span className={refreshing ? 'animate-spin inline-block' : ''}>🔄</span>
                <span>Refresh</span>
              </button>
            )}

            {/* Role badge */}
            {!loading && data && (
              <span className={`text-[10px] font-black tracking-widest uppercase px-3 py-1.5 rounded-lg border ${
                role === 'ADMIN'   ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'       :
                role === 'MANAGER' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'       :
                                     'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              }`}>
                {role}
              </span>
            )}
          </div>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {Array(3).fill(0).map((_,i) => <Sk key={i} h="h-24" />)}
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Sk h="h-40" /> <Sk h="h-40" />
            </div>
            <Sk h="h-48" />
          </div>
        )}

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            ADMIN / MANAGER DASHBOARD
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {!loading && isManagerPlus && data && (
          <>
            {/* TODAY KPIs */}
            <div>
              <p className="text-[10px] font-black tracking-[0.2em] uppercase text-slate-600 mb-3">
                Today — {new Date().toLocaleDateString('en-BD',{timeZone:'Asia/Dhaka',day:'2-digit',month:'short',year:'numeric'})}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <KCard label="Revenue Today" value={bdt(data.today.revenue)} icon="💰" accent="#22d3ee"
                       sub={`${data.today.txn} transactions`} />
                <KCard label="Units Sold"    value={String(data.today.units)} icon="📦" accent="#a78bfa"
                       sub="items today" />
                <KCard label="Transactions"  value={String(data.today.txn)} icon="🔄" accent="#34d399"
                       sub="orders placed" />
              </div>
            </div>

            {/* STOCK ALERTS + EMPLOYEE LEADERBOARD */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card title="Stock Alerts" sub="Live inventory status">
                <div className="space-y-3">
                  <Link href="/inventory_alerts"
                    className="flex items-center justify-between rounded-lg bg-red-500/8 border border-red-500/15 px-4 py-3 hover:bg-red-500/15 transition-all">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">⚠️</span>
                      <span className="text-sm text-red-300 font-semibold">Low Stock</span>
                    </div>
                    <span className="text-2xl font-black text-red-400">{data.stockAlerts.low}</span>
                  </Link>
                  <Link href="/inventory_alerts"
                    className="flex items-center justify-between rounded-lg bg-yellow-500/8 border border-yellow-500/15 px-4 py-3 hover:bg-yellow-500/15 transition-all">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">📦</span>
                      <span className="text-sm text-yellow-300 font-semibold">Overstock</span>
                    </div>
                    <span className="text-2xl font-black text-yellow-400">{data.stockAlerts.over}</span>
                  </Link>
                </div>
              </Card>

              <Card title="Employee Leaderboard" sub="This month">
                {data.employeeLeaderboard.length === 0 ? (
                  <p className="text-slate-700 text-sm text-center py-4">No data</p>
                ) : (
                  <div className="space-y-2">
                    {data.employeeLeaderboard.map((e) => (
                      <div key={e.rank} className="flex items-center gap-3 py-1.5">
                        <Medal rank={e.rank} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-200 truncate">{e.name}</p>
                          <p className="text-[10px] text-slate-700">{e.txn} orders · {e.units} units</p>
                        </div>
                        <span className="text-xs font-black text-cyan-400 flex-shrink-0">{bdt(e.revenue)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            {/* RECENT SALES */}
            <Card title="Recent Sales" sub="Latest 8 transactions across all staff">
              {data.recentSales.length === 0 ? (
                <p className="text-slate-700 text-sm text-center py-4">No sales yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs min-w-[500px]">
                    <thead>
                      <tr className="border-b border-white/6">
                        {['Product','Qty','Amount','Employee','Time'].map(h=>(
                          <th key={h} className="pb-2.5 text-left text-[10px] font-black tracking-wider uppercase text-slate-700 pr-4">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {data.recentSales.map(s=>(
                        <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-2.5 pr-4 font-semibold text-slate-300 max-w-[140px] truncate">{s.product}</td>
                          <td className="py-2.5 pr-4 text-slate-500">{s.quantity}</td>
                          <td className="py-2.5 pr-4 font-bold text-cyan-400">{bdt(s.total)}</td>
                          <td className="py-2.5 pr-4 text-slate-500">{s.employee}</td>
                          <td className="py-2.5 text-slate-700">{s.time}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </>
        )}

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            SALES EMPLOYEE DASHBOARD
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {!loading && isSales && data && (
          <>
            <div>
              <p className="text-[10px] font-black tracking-[0.2em] uppercase text-slate-600 mb-3">
                My Performance Today
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <KCard label="My Revenue" value={bdt(data.today.revenue)}  icon="💰" accent="#22d3ee" sub="today" />
                <KCard label="Units Sold" value={String(data.today.units)} icon="📦" accent="#a78bfa" sub="today" />
                <KCard label="My Orders"  value={String(data.today.txn)}   icon="🧾" accent="#34d399" sub="today" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <KCard label="Month Revenue" value={bdt(data.month.revenue)}
                     growth={data.month.revenueGrowth} icon="💵" accent="#22d3ee" sub="vs last month" />
              <KCard label="Month Units"  value={data.month.units.toLocaleString()} icon="📦" accent="#fb923c" sub="items sold" />
              <KCard label="Month Orders" value={String(data.month.txn)} icon="🔄" accent="#a78bfa" sub="transactions" />
              <div className="relative overflow-hidden rounded-xl border bg-[#0d1117] p-5 border-yellow-500/20">
                <div className="pointer-events-none absolute -right-3 -top-3 h-16 w-16 rounded-full opacity-20 blur-2xl bg-yellow-400" />
                <p className="text-[10px] font-black tracking-[0.2em] uppercase text-slate-600 mb-3">My Rank</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-black text-yellow-400">
                    {data.myRank != null ? `#${data.myRank}` : '—'}
                  </p>
                  <p className="text-[11px] text-slate-600">this month</p>
                </div>
                <p className="mt-1.5 text-[11px] text-slate-600">among all sales staff</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card title="My Last 7 Days" sub="Daily revenue">
                {data.myLast7Days.length > 0 ? (
                  <MiniBar data={data.myLast7Days} valueKey="revenue" labelKey="day" accent="#22d3ee" />
                ) : (
                  <p className="text-slate-700 text-sm text-center py-6">No sales in last 7 days</p>
                )}
              </Card>

              <Card title="My Top Products" sub="This month">
                {data.myTopProducts.length === 0 ? (
                  <p className="text-slate-700 text-sm text-center py-6">No sales this month</p>
                ) : (
                  <div className="space-y-2.5">
                    {data.myTopProducts.map((p, i) => {
                      const max = data.myTopProducts[0].revenue;
                      const pct = max > 0 ? (p.revenue / max) * 100 : 0;
                      return (
                        <div key={i}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-700 font-black w-4">{i+1}</span>
                              <span className="text-xs font-semibold text-slate-300 truncate max-w-[150px]">{p.name}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-black text-cyan-400">{bdt(p.revenue)}</span>
                              <span className="text-[10px] text-slate-700 ml-2">{p.units}u</span>
                            </div>
                          </div>
                          <div className="h-1 rounded-full bg-white/5">
                            <div className="h-full rounded-full bg-cyan-500/60" style={{ width:`${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>

            <Card title="My Recent Sales" sub="Latest 8 transactions">
              {data.myRecentSales.length === 0 ? (
                <p className="text-slate-700 text-sm text-center py-4">No sales yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs min-w-[400px]">
                    <thead>
                      <tr className="border-b border-white/6">
                        {['Product','Qty','Amount','Time'].map(h=>(
                          <th key={h} className="pb-2.5 text-left text-[10px] font-black tracking-wider uppercase text-slate-700 pr-4">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {data.myRecentSales.map(s=>(
                        <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-2.5 pr-4 font-semibold text-slate-300 max-w-[160px] truncate">{s.product}</td>
                          <td className="py-2.5 pr-4 text-slate-500">{s.quantity}</td>
                          <td className="py-2.5 pr-4 font-bold text-cyan-400">{bdt(s.total)}</td>
                          <td className="py-2.5 text-slate-700">{s.time}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </>
        )}

      </div>
    </Layout>
  );
}