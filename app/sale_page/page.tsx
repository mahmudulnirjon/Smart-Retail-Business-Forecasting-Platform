'use client';
// app/sale_page/page.tsx
// Smart Retail Business — Sales Analytics Page
// 4 KPI Cards + Top Products Bar + Revenue Trend Line + Sales Distribution Donut
// Uses existing /api/sales endpoint | Timezone: Asia/Dhaka | Currency: BDT ৳

import { useEffect, useState, useMemo } from 'react';
import Layout from '../../components/Layout';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, ArcElement,
  Title, Tooltip, Legend, Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, ArcElement,
  Title, Tooltip, Legend, Filler
);

// ─── Types ────────────────────────────────────────────────────────────────────

type FilterPeriod = 'today' | 'week' | 'month';

type SaleRow = {
  id:           number;
  product_id:   number;
  product_name: string;
  quantity:      number;
  total:         number;
  user_id:       number;
  sale_date:     string;
};

type Employee = {
  id: number;
  name: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const PALETTE = [
  '#3b82f6','#22c55e','#f59e0b','#a855f7',
  '#ef4444','#06b6d4','#ec4899','#f97316','#14b8a6','#8b5cf6',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatBDT = (n: number) =>
  '৳ ' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.round(n));

const parseDhaka = (datetime?: string): Date | null => {
  if (!datetime) return null;
  return new Date(datetime.replace(' ', 'T'));
};

const filterByPeriod = (sales: SaleRow[], period: FilterPeriod): SaleRow[] => {
  const now = new Date();
  const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });

  return sales.filter(s => {
    const d = parseDhaka(s.sale_date);
    if (!d) return false;
    const dStr = d.toLocaleDateString('en-CA');

    if (period === 'today') return dStr === todayStr;
    if (period === 'week') {
      const diff = (new Date(todayStr).getTime() - new Date(dStr).getTime()) / 86400000;
      return diff >= 0 && diff < 7;
    }
    const diff = (new Date(todayStr).getTime() - new Date(dStr).getTime()) / 86400000;
    return diff >= 0 && diff < 30;
  });
};

// ─── Chart shared options ─────────────────────────────────────────────────────

const baseTooltip = {
  backgroundColor: 'rgba(15,23,42,0.97)',
  titleColor: '#e2e8f0', bodyColor: '#94a3b8',
  borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1, padding: 10,
};

const baseScales = {
  x: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
  y: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({ label, value, icon, color, sub }: {
  label: string; value: string; icon: string; color: string; sub?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-[#0f1623] p-5">
      <div className="pointer-events-none absolute -right-3 -top-3 h-16 w-16 rounded-full opacity-15 blur-2xl"
        style={{ background: color }} />
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{label}</p>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm"
          style={{ background: color + '22', color }}>{icon}</span>
      </div>
      <p className="mt-3 text-2xl font-extrabold leading-none" style={{ color }}>{value}</p>
      {sub && <p className="mt-1.5 truncate text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

function SectionCard({ title, subtitle, children }: {
  title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-[#0f1623] p-6">
      <div className="mb-5">
        <h2 className="text-sm font-bold text-slate-200">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function PeriodBtn({ active, onClick, label }: {
  active: boolean; onClick: () => void; label: string;
}) {
  return (
    <button onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
        active ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
      }`}>
      {label}
    </button>
  );
}

// ChartBox with fixed height to avoid resize loops
function ChartBox({ height = 256, children }: { height?: number; children: React.ReactNode }) {
  return (
    <div style={{ position: 'relative', height: `${height}px`, width: '100%', overflow: 'hidden' }}>
      {children}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════════════════════

export default function SalesPage() {
  const [allSales, setAllSales] = useState<SaleRow[]>([]);
  const [employees, setEmployees] = useState<Record<number, string>>({}); // id -> name
  const [loading,  setLoading]  = useState(true);
  const [period,   setPeriod]   = useState<FilterPeriod>('today');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // Fetch sales and employees in parallel
        const [salesRes, employeesRes] = await Promise.all([
          fetch('/api/sales'),
          fetch('/api/users')   // assuming this endpoint returns list of employees with id and name
        ]);

        const salesJson = await salesRes.json();
        if (salesJson.success && Array.isArray(salesJson.data)) {
          setAllSales(salesJson.data);
        } else {
          setAllSales([]);
        }

        const employeesJson = await employeesRes.json();
        if (employeesJson.success && Array.isArray(employeesJson.data)) {
          const empMap: Record<number, string> = {};
          employeesJson.data.forEach((emp: Employee) => {
            empMap[emp.id] = emp.name;
          });
          setEmployees(empMap);
        } else {
          setEmployees({});
        }
      } catch (err) {
        console.error(err);
        setAllSales([]);
        setEmployees({});
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const sales = useMemo(() => filterByPeriod(allSales, period), [allSales, period]);

  // ── KPI calculations ──────────────────────────────────────────────────────
  const kpi = useMemo(() => {
    const totalSales   = sales.length;
    const totalUnits   = sales.reduce((s, r) => s + Number(r.quantity), 0);
    const totalRevenue = sales.reduce((s, r) => s + Number(r.total || 0), 0);

    const prodMap: Record<string, number> = {};
    sales.forEach(s => { prodMap[s.product_name] = (prodMap[s.product_name] || 0) + Number(s.quantity); });
    const bestProduct = Object.entries(prodMap).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';

    // Top employee: sum of units per user_id, then get name from employees map
    const empUnitsMap: Record<number, number> = {};
    sales.forEach(s => {
      empUnitsMap[s.user_id] = (empUnitsMap[s.user_id] || 0) + Number(s.quantity);
    });
    const topEmpId = Number(Object.entries(empUnitsMap).sort((a, b) => b[1] - a[1])[0]?.[0]);
    let topEmployee = '—';
    if (topEmpId) {
      topEmployee = employees[topEmpId] || `User ${topEmpId}`;
    }

    return { totalSales, totalUnits, totalRevenue, bestProduct, topEmployee };
  }, [sales, employees]);

  // ── Top Products chart ────────────────────────────────────────────────────
  const topProdChart = useMemo(() => {
    const map: Record<string, { units: number; revenue: number }> = {};
    sales.forEach(s => {
      if (!map[s.product_name]) map[s.product_name] = { units: 0, revenue: 0 };
      map[s.product_name].units   += Number(s.quantity);
      map[s.product_name].revenue += Number(s.total || 0);
    });

    const sorted = Object.entries(map).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 10);
    const labels = sorted.map(([name]) => name.length > 14 ? name.slice(0, 13) + '…' : name);

    return {
      labels,
      datasets: [{
        label: 'Units Sold',
        data:  sorted.map(([, v]) => v.units),
        backgroundColor: sorted.map((_, i) => PALETTE[i % PALETTE.length] + 'cc'),
        borderColor:     sorted.map((_, i) => PALETTE[i % PALETTE.length]),
        borderWidth: 1.5, borderRadius: 6,
      }],
    };
  }, [sales]);

  // ── Revenue Trend chart ───────────────────────────────────────────────────
  const revTrendChart = useMemo(() => {
    const map: Record<string, { revenue: number; units: number }> = {};

    sales.forEach(s => {
      const d = parseDhaka(s.sale_date);
      if (!d) return;
      let label = '';
      if (period === 'today') {
        label = `${d.getHours().toString().padStart(2,'0')}:00`;
      } else {
        label = d.toLocaleDateString('en-BD', { day: '2-digit', month: 'short' });
      }
      if (!map[label]) map[label] = { revenue: 0, units: 0 };
      map[label].revenue += Number(s.total || 0);
      map[label].units   += Number(s.quantity);
    });

    const sorted = Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));

    return {
      labels: sorted.map(([l]) => l),
      datasets: [
        {
          label: 'Revenue (৳)',
          data:  sorted.map(([, v]) => v.revenue),
          borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.10)',
          fill: true, tension: 0.4, pointRadius: 3, yAxisID: 'yRev',
        },
        {
          label: 'Units',
          data:  sorted.map(([, v]) => v.units),
          borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.08)',
          fill: true, tension: 0.4, pointRadius: 3, yAxisID: 'yUnits',
        },
      ],
    };
  }, [sales, period]);

  // ── Donut chart ───────────────────────────────────────────────────────────
  const donutData = useMemo(() => {
    const map: Record<string, number> = {};
    sales.forEach(s => { map[s.product_name] = (map[s.product_name] || 0) + Number(s.total || 0); });
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const total  = sorted.reduce((s, [, v]) => s + v, 0);

    return {
      total,
      labels: sorted.map(([name]) => name),
      values: sorted.map(([, v]) => v),
      chartData: {
        labels: sorted.map(([name]) => name),
        datasets: [{
          data:            sorted.map(([, v]) => v),
          backgroundColor: sorted.map((_, i) => PALETTE[i % PALETTE.length] + 'dd'),
          borderColor:     'rgba(0,0,0,0.3)',
          borderWidth: 2, hoverOffset: 6,
        }],
      },
    };
  }, [sales]);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Layout>
        <div className="space-y-6 animate-pulse">
          <div className="h-9 w-48 rounded-xl bg-white/5" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 rounded-2xl bg-white/5" />)}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="h-72 rounded-2xl bg-white/5" />
            <div className="h-72 rounded-2xl bg-white/5" />
          </div>
          <div className="h-72 rounded-2xl bg-white/5" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">

        {/* ── Header + Period Toggle ── */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-100">Sales Analytics</h1>
            <p className="mt-1 text-sm text-slate-500">
              {period === 'today' ? "Showing today's data" : period === 'week' ? 'Last 7 days' : 'Last 30 days'}
              {' · '}{sales.length} records
            </p>
          </div>
          <div className="flex gap-1 rounded-xl border border-white/8 bg-white/5 p-1">
            <PeriodBtn active={period === 'today'} onClick={() => setPeriod('today')} label="Today" />
            <PeriodBtn active={period === 'week'}  onClick={() => setPeriod('week')}  label="This Week" />
            <PeriodBtn active={period === 'month'} onClick={() => setPeriod('month')} label="This Month" />
          </div>
        </div>

        {/* ── 4 KPI Cards ── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Total Sales"  value={String(kpi.totalSales)}  icon="🛒" color="#3b82f6" />
          <KpiCard label="Units Sold"   value={String(kpi.totalUnits)}  icon="📦" color="#f59e0b" />
          <KpiCard label="Best Product" value={kpi.bestProduct}         icon="🏆" color="#a855f7" />
          <KpiCard label="Top Employee" value={kpi.topEmployee}         icon="👤" color="#06b6d4" />
        </div>

        {/* ── Top Products Bar + Revenue Trend ── */}
        <div className="grid gap-6 lg:grid-cols-2">

          <SectionCard title="Top Products" subtitle="Ranked by revenue · units sold">
            <ChartBox height={256}>
              <Bar data={topProdChart} options={{
                responsive: true, maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: {
                  legend: { display: false },
                  tooltip: { ...baseTooltip,
                    callbacks: { label: (ctx: any) => ` ${ctx.parsed.x} units` } },
                },
                scales: baseScales,
              } as any} />
            </ChartBox>
          </SectionCard>

          <SectionCard title="Revenue Trend" subtitle={period === 'today' ? 'Hourly breakdown' : 'Daily breakdown'}>
            <ChartBox height={256}>
              <Line data={revTrendChart} options={{
                responsive: true, maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                  legend: { labels: { color: '#64748b', font: { size: 10 } } },
                  tooltip: { ...baseTooltip,
                    callbacks: {
                      label: (ctx: any) => ctx.datasetIndex === 0
                        ? ` Revenue: ${formatBDT(ctx.parsed.y)}`
                        : ` Units: ${ctx.parsed.y}`,
                    },
                  },
                },
                scales: {
                  x: baseScales.x,
                  yRev: {
                    type: 'linear', position: 'left',
                    ticks: { color: '#3b82f6', font: { size: 10 },
                      callback: (v: any) => '৳' + Intl.NumberFormat('en-IN').format(v) },
                    grid: { color: 'rgba(255,255,255,0.04)' },
                  },
                  yUnits: {
                    type: 'linear', position: 'right',
                    ticks: { color: '#22c55e', font: { size: 10 } },
                    grid: { drawOnChartArea: false },
                  },
                },
              } as any} />
            </ChartBox>
          </SectionCard>
        </div>

        {/* ── Sales Distribution Donut ── */}
        <SectionCard title="Sales Distribution" subtitle="Revenue share by product">
          <div className="flex flex-col items-center gap-6 sm:flex-row">

            <ChartBox height={240}>
              <div style={{ position: 'relative', height: '100%', width: '240px', margin: '0 auto' }}>
                <Doughnut data={donutData.chartData} options={{
                  responsive: true, maintainAspectRatio: false,
                  cutout: '68%',
                  plugins: {
                    legend: { display: false },
                    tooltip: { ...baseTooltip,
                      callbacks: { label: (ctx: any) => ` ${formatBDT(ctx.parsed)}` } },
                  },
                }} />
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                  <p className="text-[10px] text-slate-500">Total Revenue</p>
                  <p className="text-sm font-bold text-slate-100">{formatBDT(donutData.total)}</p>
                </div>
              </div>
            </ChartBox>

            <div className="grid w-full gap-2 sm:grid-cols-2">
              {donutData.labels.map((name, i) => {
                const share = donutData.total > 0
                  ? ((donutData.values[i] / donutData.total) * 100).toFixed(1) : '0.0';
                return (
                  <div key={name} className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: PALETTE[i % PALETTE.length] }} />
                    <span className="min-w-0 flex-1 truncate text-xs text-slate-300">{name}</span>
                    <span className="text-xs text-slate-500">{share}%</span>
                    <span className="text-xs font-semibold text-slate-300">
                      {formatBDT(donutData.values[i])}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </SectionCard>

      </div>
    </Layout>
  );
}