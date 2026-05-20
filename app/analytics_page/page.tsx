'use client';
// app/analytics_page/page.tsx
// Advanced Analytics Dashboard — Smart Retail BI Platform
// Date range filters: Today, This Week, This Month, This Year, All Time
// Period fixed to monthly (no user toggle)
// Timezone: Asia/Dhaka (UTC+6) | Currency: BDT ৳

import { useEffect, useState, useCallback } from 'react';
import Layout from '../../components/Layout';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// ─── Types ───────────────────────────────────────────────────────────────────

type DateRange = 'today' | 'week' | 'month' | 'year' | 'all';

type KPI = {
  totalSalesCount: number;
  totalUnitsSold: number;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: string;
};

type TrendPoint = { label: string; revenue: number; units: number };
type ExpenseTrend = { label: string; expenses: number };
type ExpenseCategory = { category: string; total: number };
type ProfitPoint = { label: string; revenue: number; expenses: number; profit: number; margin: string };
type Product = { id: number; name: string; totalSold: number; revenue: number; avgPrice: number; avgSalePrice: number };
type Employee = { id: number; name: string; role: string; salesCount: number; unitsSold: number; revenue: number };
type HeatCell = { day: number; hour: number; revenue: number; txCount: number };
type DayStat = { revenue: number; units: number; txCount: number };

type AnalyticsData = {
  kpi: KPI;
  revenueTrend: TrendPoint[];
  expenseTrend: ExpenseTrend[];
  expenseByCategory: ExpenseCategory[];
  profitTrend: ProfitPoint[];
  topProducts: Product[];
  employeePerformance: Employee[];
  heatGrid: HeatCell[];
  todayStats: DayStat;
  yesterdayStats: DayStat;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const BD_DAYS = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

const formatBDT = (n: number) =>
  '৳ ' +
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.round(n));

const pctChange = (current: number, previous: number) => {
  if (previous === 0) return current > 0 ? '+100%' : '0%';
  const pct = ((current - previous) / previous) * 100;
  return (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%';
};

const isPositive = (current: number, previous: number) => current >= previous;

const PALETTE = {
  blue:    '#3b82f6',
  green:   '#22c55e',
  purple:  '#a855f7',
  amber:   '#f59e0b',
  red:     '#ef4444',
  cyan:    '#06b6d4',
  pink:    '#ec4899',
  indigo:  '#6366f1',
};

const CATEGORY_COLORS = [
  PALETTE.blue, PALETTE.green, PALETTE.amber,
  PALETTE.purple, PALETTE.red, PALETTE.cyan, PALETTE.pink,
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color, icon, today, yesterday }: {
  label: string; value: string; sub?: string; color: string; icon: string;
  today?: number; yesterday?: number;
}) {
  const showDelta = today !== undefined && yesterday !== undefined;
  const positive = showDelta ? isPositive(today!, yesterday!) : true;
  const delta = showDelta ? pctChange(today!, yesterday!) : null;

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 transition-all duration-300 hover:border-white/20 hover:bg-white/8"
      style={{ '--accent': color } as React.CSSProperties}
    >
      <div className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full opacity-10 blur-2xl" style={{ background: color }} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight" style={{ color }}>{value}</p>
          {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
        </div>
        <span className="text-2xl opacity-60">{icon}</span>
      </div>
      {delta && (
        <div className={`mt-3 flex items-center gap-1 text-xs font-medium ${positive ? 'text-green-400' : 'text-red-400'}`}>
          <span>{positive ? '▲' : '▼'}</span>
          <span>{delta} vs yesterday</span>
        </div>
      )}
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-slate-100">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

// Date range filter buttons
function DateRangeFilter({ value, onChange }: { value: DateRange; onChange: (r: DateRange) => void }) {
  const options: { key: DateRange; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'year', label: 'This Year' },
    { key: 'all', label: 'All Time' },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
            value === key
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white/5 text-slate-300 hover:bg-white/10'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function RevenueHeatmap({ heatGrid }: { heatGrid: HeatCell[] }) {
  if (!heatGrid || heatGrid.length === 0) return null;
  const maxRev = Math.max(...heatGrid.map((c) => c.revenue), 1);
  const HOURS = Array.from({ length: 24 }, (_, i) => i);
  const heatColor = (revenue: number) => {
    if (revenue === 0) return 'rgba(255,255,255,0.03)';
    const intensity = revenue / maxRev;
    const r = Math.round(59 + (168 - 59) * intensity);
    const g = Math.round(130 + (85 - 130) * intensity);
    const b = Math.round(246 + (247 - 246) * intensity);
    return `rgba(${r},${g},${b},${0.2 + intensity * 0.8})`;
  };
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[700px]">
        <div className="mb-1 flex" style={{ paddingLeft: '40px' }}>
          {HOURS.map((h) => (
            <div key={h} className="flex-1 text-center text-[9px] text-slate-500">
              {h % 3 === 0 ? (h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`) : ''}
            </div>
          ))}
        </div>
        {BD_DAYS.map((dayName, d) => (
          <div key={d} className="mb-1 flex items-center gap-1">
            <div className="w-9 shrink-0 text-right text-[10px] text-slate-400">{dayName}</div>
            {HOURS.map((h) => {
              const cell = heatGrid[d * 24 + h];
              return (
                <div
                  key={h}
                  className="group relative flex-1 cursor-default rounded"
                  style={{ height: '22px', background: heatColor(cell?.revenue || 0) }}
                >
                  {cell?.revenue > 0 && (
                    <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 rounded bg-slate-800 px-2 py-1 text-[10px] text-slate-200 shadow-lg group-hover:block whitespace-nowrap border border-white/10">
                      {dayName} {h}:00 — {formatBDT(cell.revenue)} ({cell.txCount} tx)
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
        <div className="mt-3 flex items-center gap-2 justify-end">
          <span className="text-xs text-slate-500">Low</span>
          {[0, 0.2, 0.4, 0.6, 0.8, 1].map((v) => (
            <div key={v} className="h-3 w-6 rounded" style={{ background: heatColor(v * maxRev) }} />
          ))}
          <span className="text-xs text-slate-500">High</span>
        </div>
      </div>
    </div>
  );
}

// ─── Chart base options ─────────────────────────────────────────────────────

const baseScales = {
  x: { ticks: { color: '#94a3b8', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
  y: { ticks: { color: '#94a3b8', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
};

const baseOptions = (yLabel?: string) => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: '#cbd5e1', font: { size: 12 } } },
    tooltip: {
      backgroundColor: 'rgba(15,23,42,0.95)',
      titleColor: '#e2e8f0',
      bodyColor: '#94a3b8',
      borderColor: 'rgba(255,255,255,0.1)',
      borderWidth: 1,
    },
  },
  scales: {
    ...baseScales,
    y: {
      ...baseScales.y,
      title: yLabel ? { display: true, text: yLabel, color: '#64748b', font: { size: 11 } } : undefined,
    },
  },
});

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdvancedAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'employees' | 'heatmap'>('overview');

  // Fixed period = monthly (no user toggle)
  const fetchData = useCallback(async (r: DateRange) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics?period=monthly&range=${r}`);
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (err) {
      console.error('Analytics fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(dateRange);
  }, [dateRange, fetchData]);

  if (loading) {
    return (
      <Layout>
        <div className="space-y-6 animate-pulse">
          <div className="h-10 w-64 rounded-xl bg-white/5" />
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-32 rounded-2xl bg-white/5" />)}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="h-80 rounded-2xl bg-white/5" />
            <div className="h-80 rounded-2xl bg-white/5" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!data) {
    return (
      <Layout>
        <div className="flex h-64 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/5">
          <p className="text-red-400">Failed to load analytics data. Please refresh.</p>
        </div>
      </Layout>
    );
  }

  const { kpi, revenueTrend, expenseTrend, expenseByCategory, profitTrend,
          topProducts, employeePerformance, heatGrid, todayStats, yesterdayStats } = data;

  // Chart datasets (unchanged)
  const revChartData = {
    labels: revenueTrend.map((r) => r.label),
    datasets: [
      { label: 'Revenue (৳)', data: revenueTrend.map((r) => r.revenue), borderColor: PALETTE.blue, backgroundColor: 'rgba(59,130,246,0.15)', fill: true, tension: 0.4, yAxisID: 'yRev' },
      { label: 'Units Sold', data: revenueTrend.map((r) => r.units), borderColor: PALETTE.green, backgroundColor: 'rgba(34,197,94,0.12)', fill: true, tension: 0.4, yAxisID: 'yUnits' },
    ],
  };
  const revChartOptions = {
    responsive: true, maintainAspectRatio: false, interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { labels: { color: '#cbd5e1' } },
      tooltip: {
        backgroundColor: 'rgba(15,23,42,0.95)', titleColor: '#e2e8f0', bodyColor: '#94a3b8',
        borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1,
        callbacks: { label: (ctx: any) => ctx.datasetIndex === 0 ? ` Revenue: ${formatBDT(ctx.parsed.y)}` : ` Units: ${ctx.parsed.y}` },
      },
    },
    scales: {
      x: baseScales.x,
      yRev: { type: 'linear' as const, position: 'left' as const, ticks: { color: PALETTE.blue, font: { size: 11 }, callback: (v: any) => '৳' + Intl.NumberFormat('en-IN').format(v) }, grid: { color: 'rgba(255,255,255,0.05)' } },
      yUnits: { type: 'linear' as const, position: 'right' as const, ticks: { color: PALETTE.green, font: { size: 11 } }, grid: { drawOnChartArea: false } },
    },
  };

  const profitChartData = {
    labels: profitTrend.map((r) => r.label),
    datasets: [
      { label: 'Revenue (৳)', data: profitTrend.map((r) => r.revenue), backgroundColor: 'rgba(59,130,246,0.7)', borderRadius: 4 },
      { label: 'Expenses (৳)', data: profitTrend.map((r) => r.expenses), backgroundColor: 'rgba(239,68,68,0.7)', borderRadius: 4 },
      { label: 'Net Profit (৳)', data: profitTrend.map((r) => r.profit), backgroundColor: 'rgba(34,197,94,0.7)', borderRadius: 4 },
    ],
  };

  const expCatChartData = {
    labels: expenseByCategory.map((c) => c.category),
    datasets: [{ data: expenseByCategory.map((c) => c.total), backgroundColor: CATEGORY_COLORS, borderColor: 'rgba(0,0,0,0.3)', borderWidth: 2, hoverOffset: 8 }],
  };

  const topProdChartData = {
    labels: topProducts.map((p) => p.name.length > 20 ? p.name.slice(0, 18) + '…' : p.name),
    datasets: [{ label: 'Revenue (৳)', data: topProducts.map((p) => p.revenue), backgroundColor: topProducts.map((_, i) => `hsl(${210 + i * 15}, 80%, 60%)`), borderRadius: 6 }],
  };
  const topProdOptions = {
    ...baseOptions('Revenue (৳)'),
    indexAxis: 'y' as const,
    plugins: { ...baseOptions().plugins, tooltip: { ...baseOptions().plugins.tooltip, callbacks: { label: (ctx: any) => ` ${formatBDT(ctx.parsed.x)} — ${topProducts[ctx.dataIndex]?.totalSold} units` } } },
  };

  const empChartData = {
    labels: employeePerformance.map((e) => e.name),
    datasets: [
      { label: 'Revenue (৳)', data: employeePerformance.map((e) => e.revenue), backgroundColor: PALETTE.purple, borderRadius: 6, yAxisID: 'yRev' },
      { label: 'Sales Count', data: employeePerformance.map((e) => e.salesCount), backgroundColor: PALETTE.amber, borderRadius: 6, yAxisID: 'yCnt' },
    ],
  };
  const empOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { labels: { color: '#cbd5e1' } }, tooltip: { backgroundColor: 'rgba(15,23,42,0.95)', titleColor: '#e2e8f0', bodyColor: '#94a3b8', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 } },
    scales: {
      x: baseScales.x,
      yRev: { type: 'linear' as const, position: 'left' as const, ticks: { color: PALETTE.purple, font: { size: 11 }, callback: (v: any) => '৳' + Intl.NumberFormat('en-IN').format(v) }, grid: { color: 'rgba(255,255,255,0.05)' } },
      yCnt: { type: 'linear' as const, position: 'right' as const, ticks: { color: PALETTE.amber, font: { size: 11 } }, grid: { drawOnChartArea: false } },
    },
  };

  // Tab buttons with larger size
  const TABS: { key: typeof activeTab; label: string; icon: string }[] = [
    { key: 'overview', label: 'Overview', icon: '📊' },
    { key: 'products', label: 'Top Products', icon: '📦' },
    { key: 'employees', label: 'Employees', icon: '👥' },
    { key: 'heatmap', label: 'Heatmap', icon: '🌡️' },
  ];

  return (
    <Layout>
      <div className="space-y-8">

        {/* Page Header + Filters */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-100">Advanced Analytics</h1>
            <p className="mt-1 text-sm text-slate-400">Revenue · Expenses · Profit · Performance · Heatmap</p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <DateRangeFilter value={dateRange} onChange={setDateRange} />
          </div>
        </div>

        {/* KPI Cards */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <KpiCard label="Total Revenue" value={formatBDT(kpi.totalRevenue)} color={PALETTE.blue} icon="💰" />
          <KpiCard label="Total Expenses" value={formatBDT(kpi.totalExpenses)} color={PALETTE.red} icon="🧾" />
          <KpiCard label="Net Profit" value={formatBDT(kpi.netProfit)} color={kpi.netProfit >= 0 ? PALETTE.green : PALETTE.red} icon="📈" />
          <KpiCard label="Profit Margin" value={`${kpi.profitMargin}%`} color={PALETTE.purple} icon="📉" />
          <KpiCard label="Total Sales" value={kpi.totalSalesCount.toLocaleString()} color={PALETTE.amber} icon="🛒" />
          <KpiCard label="Units Sold" value={kpi.totalUnitsSold.toLocaleString()} color={PALETTE.cyan} icon="📦" />
        </section>

        {/* Today vs Yesterday cards – only when range = 'today' */}
        {dateRange === 'today' && (
          <section className="grid gap-4 sm:grid-cols-3">
            {[
              { label: 'Revenue Today', today: todayStats.revenue, yesterday: yesterdayStats.revenue, fmt: formatBDT, color: PALETTE.blue },
              { label: 'Transactions Today', today: todayStats.txCount, yesterday: yesterdayStats.txCount, fmt: (n: number) => n.toString(), color: PALETTE.amber },
              { label: 'Units Sold Today', today: todayStats.units, yesterday: yesterdayStats.units, fmt: (n: number) => n.toString(), color: PALETTE.cyan },
            ].map(({ label, today, yesterday, fmt, color }) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-xs text-slate-400">{label}</p>
                <p className="mt-2 text-xl font-bold" style={{ color }}>{fmt(today)}</p>
                <div className="mt-2 flex items-center gap-3">
                  <div className="h-1.5 flex-1 rounded-full bg-white/10">
                    <div className="h-1.5 rounded-full transition-all" style={{ width: `${Math.min((today / Math.max(today, yesterday, 1)) * 100, 100)}%`, background: color }} />
                  </div>
                  <span className={`text-xs font-medium ${isPositive(today, yesterday) ? 'text-green-400' : 'text-red-400'}`}>
                    {pctChange(today, yesterday)}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">Yesterday: {fmt(yesterday)}</p>
              </div>
            ))}
          </section>
        )}

        {/* Tab Navigation - LARGER BUTTONS */}
        <div className="flex gap-3 border-b border-white/10 pb-0">
          {TABS.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 rounded-t-lg px-6 py-3 text-base font-semibold transition-all ${
                activeTab === key 
                  ? 'border-b-2 border-blue-500 text-blue-400 bg-white/5' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <span className="text-lg">{icon}</span> {label}
            </button>
          ))}
        </div>

        {/* Tab Contents (unchanged except subtitles simplified) */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <Section title="Revenue & Units Trend" subtitle="Monthly breakdown of revenue and units sold">
              <div className="h-[340px]"><Line data={revChartData} options={revChartOptions} /></div>
            </Section>
            <Section title="Revenue · Expenses · Profit" subtitle="Period comparison of income, spending, and net profit">
              <div className="h-[320px]"><Bar data={profitChartData} options={baseOptions('Amount (৳)') as any} /></div>
            </Section>
            <div className="grid gap-6 lg:grid-cols-2">
              <Section title="Expense Breakdown" subtitle="Spending by category">
                <div className="h-[280px]"><Doughnut data={expCatChartData} options={{ responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { labels: { color: '#cbd5e1', font: { size: 11 } } }, tooltip: { callbacks: { label: (ctx: any) => ` ${ctx.label}: ${formatBDT(ctx.parsed)}` } } } }} /></div>
                <div className="mt-4 space-y-2">
                  {expenseByCategory.map((cat, i) => (
                    <div key={cat.category} className="flex items-center gap-3">
                      <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                      <span className="flex-1 text-sm text-slate-300">{cat.category}</span>
                      <span className="text-sm font-semibold text-slate-100">{formatBDT(cat.total)}</span>
                    </div>
                  ))}
                </div>
              </Section>
              <Section title="Profit Margin Trend" subtitle="Net profit margin % per month">
                <div className="h-[280px]">
                  <Line data={{ labels: profitTrend.map((r) => r.label), datasets: [{ label: 'Margin %', data: profitTrend.map((r) => parseFloat(r.margin)), borderColor: PALETTE.green, backgroundColor: 'rgba(34,197,94,0.12)', fill: true, tension: 0.4, pointRadius: 3 }] }} options={{ ...baseOptions('Margin (%)'), plugins: { ...(baseOptions('Margin (%)').plugins as any), tooltip: { callbacks: { label: (ctx: any) => ` Margin: ${ctx.parsed.y}%` } } } } as any} />
                </div>
              </Section>
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="space-y-6">
            <Section title="Top 10 Products by Revenue" subtitle="Product revenue ranking">
              <div className="h-[400px]"><Bar data={topProdChartData} options={topProdOptions as any} /></div>
            </Section>
            <Section title="Product Performance Table">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-white/10 text-left text-xs text-slate-400"><th className="pb-3 pr-4">#</th><th className="pb-3 pr-4">Product</th><th className="pb-3 pr-4 text-right">Revenue</th><th className="pb-3 pr-4 text-right">Units Sold</th><th className="pb-3 pr-4 text-right">Avg Price</th><th className="pb-3 text-right">Revenue Share</th></tr></thead>
                  <tbody>
                    {topProducts.map((p, i) => {
                      const share = kpi.totalRevenue > 0 ? ((p.revenue / kpi.totalRevenue) * 100).toFixed(1) : '0.0';
                      return (<tr key={p.id} className="border-b border-white/5 hover:bg-white/3"><td className="py-3 pr-4 text-slate-500">{i+1}</td><td className="py-3 pr-4 font-medium text-slate-100">{p.name}</td><td className="py-3 pr-4 text-right font-semibold text-blue-400">{formatBDT(p.revenue)}</td><td className="py-3 pr-4 text-right text-slate-300">{p.totalSold.toLocaleString()}</td><td className="py-3 pr-4 text-right text-slate-300">{formatBDT(p.avgPrice)}</td><td className="py-3 text-right"><div className="flex items-center justify-end gap-2"><div className="h-1.5 w-20 rounded-full bg-white/10"><div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${share}%` }} /></div><span className="w-10 text-xs text-slate-400">{share}%</span></div></td></tr>);
                    })}
                  </tbody>
                </table>
              </div>
            </Section>
          </div>
        )}

        {activeTab === 'employees' && (
          <div className="space-y-6">
            <Section title="Employee Revenue vs Sales Count" subtitle="All-time performance comparison">
              <div className="h-[360px]"><Bar data={empChartData} options={empOptions as any} /></div>
            </Section>
            <Section title="Employee Leaderboard">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-white/10 text-left text-xs text-slate-400"><th className="pb-3 pr-4">Rank</th><th className="pb-3 pr-4">Employee</th><th className="pb-3 pr-4">Role</th><th className="pb-3 pr-4 text-right">Revenue</th><th className="pb-3 pr-4 text-right">Sales</th><th className="pb-3 text-right">Units</th></tr></thead>
                  <tbody>
                    {employeePerformance.map((emp, i) => {
                      const medals = ['🥇', '🥈', '🥉'];
                      return (<tr key={emp.id} className="border-b border-white/5 hover:bg-white/3"><td className="py-3 pr-4 text-xl">{medals[i] || `#${i+1}`}</td><td className="py-3 pr-4 font-semibold text-slate-100">{emp.name}</td><td className="py-3 pr-4"><span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${emp.role === 'MANAGER' ? 'bg-blue-500/20 text-blue-300' : 'bg-green-500/20 text-green-300'}`}>{emp.role}</span></td><td className="py-3 pr-4 text-right font-semibold text-purple-400">{formatBDT(emp.revenue)}</td><td className="py-3 pr-4 text-right text-slate-300">{emp.salesCount.toLocaleString()}</td><td className="py-3 text-right text-slate-300">{emp.unitsSold.toLocaleString()}</td></tr>);
                    })}
                  </tbody>
                </table>
              </div>
            </Section>
          </div>
        )}

        {activeTab === 'heatmap' && (
          <div className="space-y-6">
            <Section title="Revenue Heatmap" subtitle="Day-of-week × Hour-of-day revenue intensity (Dhaka time, Bangladesh week: Sat–Fri)">
              <RevenueHeatmap heatGrid={heatGrid} />
            </Section>
            <Section title="Peak Revenue Hours" subtitle="Top 5 most active hour slots">
              <div className="grid gap-3 sm:grid-cols-5">
                {[...heatGrid].sort((a,b)=>b.revenue - a.revenue).slice(0,5).map((cell,i)=>{
                  const dayName = BD_DAYS[cell.day];
                  const hour12 = cell.hour === 0 ? '12:00 AM' : cell.hour < 12 ? `${cell.hour}:00 AM` : cell.hour === 12 ? '12:00 PM' : `${cell.hour-12}:00 PM`;
                  return (<div key={i} className="rounded-xl border border-white/10 bg-white/5 p-4 text-center"><p className="text-2xl font-bold text-blue-400">#{i+1}</p><p className="mt-1 text-sm font-semibold text-slate-200">{dayName}</p><p className="text-xs text-slate-400">{hour12}</p><p className="mt-2 text-sm font-bold text-green-400">{formatBDT(cell.revenue)}</p><p className="text-xs text-slate-500">{cell.txCount} transactions</p></div>);
                })}
              </div>
            </Section>
          </div>
        )}
      </div>
    </Layout>
  );
}