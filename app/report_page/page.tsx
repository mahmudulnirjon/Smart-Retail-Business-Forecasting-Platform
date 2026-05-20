'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Layout from '../../components/Layout';

type Grain   = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
type SortDir = 'asc' | 'desc';
type RangePreset = 'today' | 'week' | 'month' | 'year' | 'all' | 'custom';

interface Summary {
  totalRevenue: number; totalExpenses: number; netProfit: number;
  profitMarginPct: number; totalUnitsSold: number; totalTransactions: number;
}
interface RevExpRow {
  period: string; revenue: number; expense: number;
  profit: number; margin: number; units: number; txn: number;
}
interface ProductRow {
  id: number; name: string; unitsSold: number; revenue: number; profit: number; txn: number;
}
interface EmpRow {
  id: number; name: string; totalSales: number; revenue: number; units: number; avgPerSale: number;
}
interface FilterOpt { id: number; name: string }
interface ReportData {
  role: 'ADMIN' | 'MANAGER' | 'SALES';
  summary: Summary;
  revenueExpenseTable: RevExpRow[];
  topProducts: ProductRow[];
  employeeTable: EmpRow[];
  filterOptions: { products: FilterOpt[]; employees: FilterOpt[] };
}

function bdt(n: number = 0): string {
  const sign = n < 0 ? '-' : '';
  const s    = Math.round(Math.abs(n)).toString();
  if (s.length <= 3) return `${sign}৳${s}`;
  const last3 = s.slice(-3);
  const rest  = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${sign}৳${rest},${last3}`;
}

function fmtPeriod(p: string, grain: Grain): string {
  if (!p) return '';
  if (grain === 'yearly')    return p.slice(0, 4);
  if (grain === 'quarterly') {
    const d = new Date(p); const q = Math.ceil((d.getMonth() + 1) / 3);
    return `Q${q} ${d.getFullYear()}`;
  }
  if (grain === 'monthly') {
    const [y, m] = p.split('-');
    const months = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[parseInt(m)]} '${y.slice(2)}`;
  }
  if (grain === 'weekly') return `Wk ${p.slice(5, 10)}`;
  return new Date(p).toLocaleDateString('en-BD', { day: '2-digit', month: 'short' });
}

function Sk({ h = 'h-24' }: { h?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-white/5 ${h}`} />;
}

function SortTH({ label, col, sortCol, sortDir, onSort }: {
  label: string; col: string; sortCol: string; sortDir: SortDir;
  onSort: (c: string) => void;
}) {
  const active = sortCol === col;
  return (
    <th onClick={() => onSort(col)}
      className="cursor-pointer select-none whitespace-nowrap py-3 pr-6 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-cyan-400 transition-colors">
      <span className="flex items-center gap-1">
        {label}
        <span className="text-[10px]">{active ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}</span>
      </span>
    </th>
  );
}

function Pct({ v }: { v: number }) {
  const ok = v >= 0;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
      ok ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
    }`}>
      {ok ? '▲' : '▼'} {Math.abs(v).toFixed(1)}%
    </span>
  );
}

function Rank({ i }: { i: number }) {
  const cls =
    i === 0 ? 'bg-yellow-400/20 text-yellow-400' :
    i === 1 ? 'bg-slate-400/20 text-slate-300'   :
    i === 2 ? 'bg-orange-400/20 text-orange-400' :
              'bg-white/5 text-slate-500';
  return (
    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${cls}`}>
      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
    </span>
  );
}

// ─── Multi‑Select Dropdown Component ────────────────────────────────────────
function MultiSelect({ options, selected, onChange, placeholder, label }: {
  options: FilterOpt[];
  selected: number[];
  onChange: (ids: number[]) => void;
  placeholder: string;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggle = (id: number) => {
    if (selected.includes(id)) {
      onChange(selected.filter(i => i !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  const selectedNames = options.filter(o => selected.includes(o.id)).map(o => o.name);
  const displayText = selectedNames.length ? selectedNames.join(', ') : placeholder;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex min-w-[160px] items-center justify-between gap-2 rounded-xl border border-white/8 bg-slate-900 px-4 py-2 text-xs text-slate-300 hover:bg-slate-800"
      >
        <span className="truncate">{displayText}</span>
        <span className="text-slate-500">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="absolute z-20 mt-1 max-h-60 w-full min-w-[200px] overflow-auto rounded-xl border border-white/10 bg-slate-900 p-2 shadow-xl">
          <div className="sticky top-0 bg-slate-900 px-2 pb-1 text-[10px] font-semibold text-slate-500">{label}</div>
          {options.map(opt => (
            <label key={opt.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/5">
              <input
                type="checkbox"
                checked={selected.includes(opt.id)}
                onChange={() => toggle(opt.id)}
                className="h-3 w-3 rounded border-white/20 bg-slate-800"
              />
              <span className="text-xs text-slate-300">{opt.name}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Helper to get human‑readable range string for PDF ──────────────────────
function getRangeDescription(preset: RangePreset, from: string, to: string): string {
  if (preset === 'today') {
    const d = new Date(from);
    return `Today: ${d.toLocaleDateString('en-BD', { year: 'numeric', month: 'long', day: 'numeric' })}`;
  }
  if (preset === 'week') {
    const start = new Date(from);
    const end = new Date(to);
    return `This Week: ${start.toLocaleDateString('en-BD', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-BD', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }
  if (preset === 'month') {
    const d = new Date(from);
    return `This Month: ${d.toLocaleDateString('en-BD', { month: 'long', year: 'numeric' })}`;
  }
  if (preset === 'year') {
    const y = new Date(from).getFullYear();
    return `This Year: ${y}`;
  }
  if (preset === 'all') {
    return 'All Time';
  }
  // custom
  const start = new Date(from);
  const end = new Date(to);
  return `${start.toLocaleDateString('en-BD')} – ${end.toLocaleDateString('en-BD')}`;
}

export default function ReportsPage() {
  const [from,     setFrom]     = useState('2025-10-01');
  const [to,       setTo]       = useState(new Date().toISOString().split('T')[0]);
  const [rangePreset, setRangePreset] = useState<RangePreset>('custom');
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<number[]>([]);

  const [data,    setData]    = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const [revSort,  setRevSort]  = useState<{ col: string; dir: SortDir }>({ col: 'period',  dir: 'asc'  });
  const [prodSort, setProdSort] = useState<{ col: string; dir: SortDir }>({ col: 'revenue', dir: 'desc' });
  const [empSort,  setEmpSort]  = useState<{ col: string; dir: SortDir }>({ col: 'revenue', dir: 'desc' });

  const reportRef = useRef<HTMLDivElement>(null);

  const grain: Grain = 'daily';

  // Build API query string: product and employee as comma‑separated if multiple
  const getProductParam = () => selectedProducts.length ? selectedProducts.join(',') : '';
  const getEmployeeParam = () => selectedEmployees.length ? selectedEmployees.join(',') : '';

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({
        from, to, grain,
        product: getProductParam(),
        employee: getEmployeeParam(),
      });
      const res = await fetch(`/api/reports?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Failed to load report');
      setData(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [from, to, grain, selectedProducts, selectedEmployees]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Preset logic
  const getDateRangeFromPreset = (preset: Exclude<RangePreset, 'custom'>): { from: string; to: string } => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    if (preset === 'today') return { from: todayStr, to: todayStr };
    if (preset === 'week') {
      const start = new Date(today);
      start.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1));
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { from: start.toISOString().split('T')[0], to: end.toISOString().split('T')[0] };
    }
    if (preset === 'month') {
      const fromStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-01`;
      return { from: fromStr, to: todayStr };
    }
    if (preset === 'year') {
      return { from: `${today.getFullYear()}-01-01`, to: todayStr };
    }
    return { from: '2020-01-01', to: todayStr };
  };

  const applyPreset = (preset: Exclude<RangePreset, 'custom'>) => {
    const { from: newFrom, to: newTo } = getDateRangeFromPreset(preset);
    setFrom(newFrom);
    setTo(newTo);
    setRangePreset(preset);
  };

  const handleCustomFromChange = (val: string) => {
    setFrom(val);
    setRangePreset('custom');
  };
  const handleCustomToChange = (val: string) => {
    setTo(val);
    setRangePreset('custom');
  };

  function sortRows<T extends Record<string, any>>(rows: T[], sort: { col: string; dir: SortDir }): T[] {
    return [...rows].sort((a, b) => {
      const av = a[sort.col]; const bv = b[sort.col];
      const cmp = typeof av === 'string' ? av.localeCompare(bv) : (av ?? 0) - (bv ?? 0);
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }
  function toggleSort(cur: { col: string; dir: SortDir }, set: (s: any) => void, col: string) {
    set({ col, dir: cur.col === col && cur.dir === 'desc' ? 'asc' : 'desc' });
  }

  const revRows  = sortRows(data?.revenueExpenseTable ?? [], revSort);
  const prodRows = sortRows(data?.topProducts         ?? [], prodSort);
  const empRows  = sortRows(data?.employeeTable       ?? [], empSort);

  const isManagerPlus = data?.role === 'ADMIN' || data?.role === 'MANAGER';
  const summary       = data?.summary;
  const filterOpts    = data?.filterOptions;

  // ─── PDF Export ────────────────────────────────────────────────────────────
  function bdtPDF(n: number = 0): string {
    const sign = n < 0 ? '-' : '';
    const s    = Math.round(Math.abs(n)).toString();
    if (s.length <= 3) return `${sign}BDT ${s}`;
    const last3 = s.slice(-3);
    const rest  = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    return `${sign}BDT ${rest},${last3}`;
  }

  async function exportPDF() {
    if (!data || !summary) return;
    const { default: jsPDF }     = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('Smart Retail Business — Business Report', 14, 16);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);

    // Range line (no "Group by")
    const rangeText = getRangeDescription(rangePreset, from, to);
    doc.text(`Period: ${rangeText}`, 14, 23);

    // Filter info line
    let filterText = '';
    if (selectedProducts.length) {
      const productNames = filterOpts?.products.filter(p => selectedProducts.includes(p.id)).map(p => p.name).join(', ') || '';
      filterText += `Products: ${productNames} | `;
    } else {
      filterText += 'Products: All | ';
    }
    if (isManagerPlus) {
      if (selectedEmployees.length) {
        const empNames = filterOpts?.employees.filter(e => selectedEmployees.includes(e.id)).map(e => e.name).join(', ') || '';
        filterText += `Employees: ${empNames}`;
      } else {
        filterText += 'Employees: All';
      }
    } else {
      filterText = filterText.slice(0, -3);
    }
    doc.text(filterText, 14, 30);

    doc.setDrawColor(200, 200, 200);
    doc.line(14, 33, W - 14, 33);

    // Summary
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('Summary', 14, 40);

    autoTable(doc, {
      startY: 43,
      margin: { left: 14, right: 14 },
      head: [['Total Revenue', 'Total Expenses', 'Net Profit', 'Margin %', 'Units Sold', 'Transactions']],
      body: [[
        bdtPDF(summary.totalRevenue),
        bdtPDF(summary.totalExpenses),
        bdtPDF(summary.netProfit),
        `${summary.profitMarginPct}%`,
        summary.totalUnitsSold.toLocaleString(),
        summary.totalTransactions.toLocaleString(),
      ]],
      styles:             { fontSize: 8, textColor: [30, 30, 30], fillColor: [255, 255, 255] },
      headStyles:         { fillColor: [240, 240, 240], textColor: [50, 50, 50], fontStyle: 'bold' },
      tableLineColor:     [200, 200, 200],
      tableLineWidth:     0.2,
    });

    // Revenue & Expense
    const y1 = (doc as any).lastAutoTable.finalY + 6;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('Revenue & Expense by Day', 14, y1);

    autoTable(doc, {
      startY: y1 + 3,
      margin: { left: 14, right: 14 },
      head: [['Date', 'Revenue', 'Expense', 'Profit', 'Margin %', 'Units', 'Txn']],
      body: revRows.map(r => [
        fmtPeriod(r.period, grain),
        bdtPDF(r.revenue), bdtPDF(r.expense), bdtPDF(r.profit),
        `${r.margin}%`, r.units, r.txn,
      ]),
      styles:             { fontSize: 7.5, textColor: [30, 30, 30], fillColor: [255, 255, 255] },
      headStyles:         { fillColor: [240, 240, 240], textColor: [50, 50, 50], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 248, 248] },
      tableLineColor:     [200, 200, 200],
      tableLineWidth:     0.2,
    });

    // Top Products
    const y2 = (doc as any).lastAutoTable.finalY + 6;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('Top Products', 14, y2);

    autoTable(doc, {
      startY: y2 + 3,
      margin: { left: 14, right: 14 },
      head: [['Product', 'Units Sold', 'Revenue', 'Est. Profit', 'Txn']],
      body: prodRows.map(r => [r.name, r.unitsSold, bdtPDF(r.revenue), bdtPDF(r.profit), r.txn]),
      styles:             { fontSize: 7.5, textColor: [30, 30, 30], fillColor: [255, 255, 255] },
      headStyles:         { fillColor: [240, 240, 240], textColor: [50, 50, 50], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 248, 248] },
      tableLineColor:     [200, 200, 200],
      tableLineWidth:     0.2,
    });

    // Employee Performance
    if (isManagerPlus && empRows.length > 0) {
      const y3 = (doc as any).lastAutoTable.finalY + 6;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 30, 30);
      doc.text('Employee Performance', 14, y3);

      autoTable(doc, {
        startY: y3 + 3,
        margin: { left: 14, right: 14 },
        head: [['Employee', 'Total Sales', 'Revenue', 'Units', 'Avg per Sale']],
        body: empRows.map(r => [r.name, r.totalSales, bdtPDF(r.revenue), r.units, bdtPDF(r.avgPerSale)]),
        styles:             { fontSize: 7.5, textColor: [30, 30, 30], fillColor: [255, 255, 255] },
        headStyles:         { fillColor: [240, 240, 240], textColor: [50, 50, 50], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 248, 248] },
        tableLineColor:     [200, 200, 200],
        tableLineWidth:     0.2,
      });
    }

    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(160, 160, 160);
      const ph = doc.internal.pageSize.getHeight();
      doc.text(`Page ${i} of ${pageCount}`, W - 14, ph - 8, { align: 'right' });
      doc.text('Smart Retail Business', 14, ph - 8);
    }
    doc.save(`SmartRetail_Report_${from}_${to}.pdf`);
  }

  async function exportExcel() {
    if (!data || !summary) return;
    const XLSX = await import('xlsx');
    const wb   = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Smart Retail Business — Report Summary'],
      [`Period: ${getRangeDescription(rangePreset, from, to)}`], [],
      ['Metric', 'Value'],
      ['Total Revenue',      summary.totalRevenue],
      ['Total Expenses',     summary.totalExpenses],
      ['Net Profit',         summary.netProfit],
      ['Profit Margin %',    summary.profitMarginPct],
      ['Total Units Sold',   summary.totalUnitsSold],
      ['Total Transactions', summary.totalTransactions],
    ]), 'Summary');

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
      revRows.map(r => ({
        Date: fmtPeriod(r.period, grain), Revenue: r.revenue, Expense: r.expense,
        Profit: r.profit, 'Margin %': r.margin, 'Units Sold': r.units, Transactions: r.txn,
      }))
    ), 'Revenue & Expense');

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
      prodRows.map(r => ({
        Product: r.name, 'Units Sold': r.unitsSold,
        Revenue: r.revenue, 'Est. Profit': r.profit, Transactions: r.txn,
      }))
    ), 'Top Products');

    if (isManagerPlus && empRows.length) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
        empRows.map(r => ({
          Employee: r.name, 'Total Sales': r.totalSales,
          Revenue: r.revenue, Units: r.units, 'Avg per Sale': r.avgPerSale,
        }))
      ), 'Employees');
    }
    XLSX.writeFile(wb, `SmartRetail_Report_${from}_${to}.xlsx`);
  }

  return (
    <Layout>
      <div className="space-y-6" ref={reportRef}>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Reports</h1>
            <p className="mt-1 text-sm text-slate-400">
              {data?.role === 'SALES'
                ? 'Your personal sales report'
                : 'Full business report · BDT ৳ · Dhaka UTC+6 · Daily grouping'}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={exportPDF} disabled={loading || !data}
              className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-500/20 disabled:opacity-40">
              📄 Export PDF
            </button>
            <button onClick={exportExcel} disabled={loading || !data}
              className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-400 transition hover:bg-emerald-500/20 disabled:opacity-40">
              📊 Export Excel
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-400">
            ⚠️ {error}
          </div>
        )}

        {/* Filter Bar with multi‑selects */}
        <div className="rounded-2xl border border-white/8 bg-white/5 p-5">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">Filters</p>
          <div className="flex flex-wrap gap-3 items-center">
            {/* Preset Buttons */}
            <div className="flex flex-wrap gap-2">
              {(['today','week','month','year','all'] as const).map(preset => (
                <button
                  key={preset}
                  onClick={() => applyPreset(preset)}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                    rangePreset === preset
                      ? 'bg-cyan-500/30 text-cyan-300 shadow ring-1 ring-cyan-500/50'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  {preset === 'today' ? 'Today' : preset === 'week' ? 'This Week' : preset === 'month' ? 'This Month' : preset === 'year' ? 'This Year' : 'All Time'}
                </button>
              ))}
            </div>

            {/* Custom Date Pickers */}
            <div className="flex items-center gap-2 rounded-xl border border-white/8 bg-slate-900 px-3 py-1.5">
              <span className="text-xs text-slate-500">From</span>
              <input type="date" value={from} onChange={e => handleCustomFromChange(e.target.value)}
                className="bg-transparent text-xs text-slate-200 outline-none cursor-pointer" />
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-white/8 bg-slate-900 px-3 py-1.5">
              <span className="text-xs text-slate-500">To</span>
              <input type="date" value={to} onChange={e => handleCustomToChange(e.target.value)}
                className="bg-transparent text-xs text-slate-200 outline-none cursor-pointer" />
            </div>

            {/* Multi‑select Product Filter */}
            {filterOpts?.products && (
              <MultiSelect
                options={filterOpts.products}
                selected={selectedProducts}
                onChange={setSelectedProducts}
                placeholder="All Products"
                label="Select Products"
              />
            )}

            {/* Multi‑select Employee Filter (only for managers) */}
            {isManagerPlus && filterOpts?.employees && (
              <MultiSelect
                options={filterOpts.employees}
                selected={selectedEmployees}
                onChange={setSelectedEmployees}
                placeholder="All Employees"
                label="Select Employees"
              />
            )}
          </div>
        </div>

        {/* KPI Cards (identical) */}
        {loading ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
            {Array(6).fill(0).map((_,i) => <Sk key={i} h="h-28" />)}
          </div>
        ) : summary ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
            {([
              { label:'Total Revenue',  value:bdt(summary.totalRevenue),                        icon:'💰', accent:'#22d3ee', hide:false },
              { label:'Total Expenses', value:bdt(summary.totalExpenses),                       icon:'🧾', accent:'#f87171', hide:!isManagerPlus },
              { label:'Net Profit',     value:bdt(summary.netProfit),                           icon:'📈', accent:'#34d399', hide:!isManagerPlus },
              { label:'Profit Margin',  value:`${summary.profitMarginPct}%`,                    icon:'📊', accent:'#a78bfa', hide:!isManagerPlus },
              { label:'Units Sold',     value:summary.totalUnitsSold.toLocaleString(),          icon:'📦', accent:'#fb923c', hide:false },
              { label:'Transactions',   value:summary.totalTransactions.toLocaleString(),       icon:'🔄', accent:'#f472b6', hide:false },
            ] as const).filter(c => !c.hide).map(card => (
              <div key={card.label}
                className="relative overflow-hidden rounded-2xl border bg-[#0f1623] p-5 shadow-xl"
                style={{ borderColor:`${card.accent}25` }}>
                <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-20 blur-2xl"
                     style={{ background:card.accent }} />
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">{card.label}</span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl text-base"
                        style={{ background:`${card.accent}1a`, color:card.accent }}>
                    {card.icon}
                  </span>
                </div>
                <p className="text-xl font-extrabold leading-none" style={{ color:card.accent }}>
                  {card.value}
                </p>
              </div>
            ))}
          </div>
        ) : null}

        {/* Revenue & Expense Table (unchanged) */}
        <div className="rounded-2xl border border-white/8 bg-[#0f1623] p-6 shadow-xl">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-slate-200">Revenue & Expense by Day</h2>
            <p className="text-xs text-slate-500 mt-0.5">Click column headers to sort</p>
          </div>
          {loading ? <Sk h="h-48" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/8">
                    {[
                      { label:'Date',     col:'period'  },
                      { label:'Revenue',  col:'revenue' },
                      ...(isManagerPlus ? [
                        { label:'Expense', col:'expense' },
                        { label:'Profit',  col:'profit'  },
                        { label:'Margin',  col:'margin'  },
                      ] : []),
                      { label:'Units', col:'units' },
                      { label:'Txn',   col:'txn'   },
                    ].map(h => (
                      <SortTH key={h.col} label={h.label} col={h.col}
                        sortCol={revSort.col} sortDir={revSort.dir}
                        onSort={c => toggleSort(revSort, setRevSort, c)} />
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {revRows.map((r, i) => (
                    <tr key={i} className="hover:bg-white/3 transition-colors">
                      <td className="py-3 pr-6 font-medium text-slate-300">{fmtPeriod(r.period, grain)}</td>
                      <td className="py-3 pr-6 font-bold text-cyan-400">{bdt(r.revenue)}</td>
                      {isManagerPlus && <>
                        <td className="py-3 pr-6 text-red-400">{bdt(r.expense)}</td>
                        <td className={`py-3 pr-6 font-semibold ${r.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {bdt(r.profit)}
                        </td>
                        <td className="py-3 pr-6"><Pct v={r.margin} /></td>
                      </>}
                      <td className="py-3 pr-6 text-slate-400">{r.units.toLocaleString()}</td>
                      <td className="py-3 text-slate-400">{r.txn}</td>
                    </tr>
                  ))}
                  {revRows.length > 0 && (
                    <tr className="border-t-2 border-white/10 font-bold">
                      <td className="pt-3 pr-6 text-xs uppercase text-slate-500">Total</td>
                      <td className="pt-3 pr-6 text-cyan-300">{bdt(revRows.reduce((s,r)=>s+r.revenue,0))}</td>
                      {isManagerPlus && <>
                        <td className="pt-3 pr-6 text-red-300">{bdt(revRows.reduce((s,r)=>s+r.expense,0))}</td>
                        <td className="pt-3 pr-6 text-emerald-300">{bdt(revRows.reduce((s,r)=>s+r.profit,0))}</td>
                        <td className="pt-3 pr-6" />
                      </>}
                      <td className="pt-3 pr-6 text-slate-300">{revRows.reduce((s,r)=>s+r.units,0).toLocaleString()}</td>
                      <td className="pt-3 text-slate-300">{revRows.reduce((s,r)=>s+r.txn,0)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
              {revRows.length === 0 && (
                <p className="py-8 text-center text-slate-600 text-sm">No data for selected period</p>
              )}
            </div>
          )}
        </div>

        {/* Top Products Table (unchanged) */}
        <div className="rounded-2xl border border-white/8 bg-[#0f1623] p-6 shadow-xl">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-slate-200">Top Products</h2>
            <p className="text-xs text-slate-500 mt-0.5">Ranked by revenue · selected period</p>
          </div>
          {loading ? <Sk h="h-48" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/8">
                    <th className="pb-3 text-left text-xs text-slate-500 w-8">#</th>
                    {[
                      { label:'Product Name', col:'name'      },
                      { label:'Units Sold',   col:'unitsSold' },
                      { label:'Revenue',      col:'revenue'   },
                      { label:'Est. Profit',  col:'profit'    },
                      { label:'Txn',          col:'txn'       },
                    ].map(h => (
                      <SortTH key={h.col} label={h.label} col={h.col}
                        sortCol={prodSort.col} sortDir={prodSort.dir}
                        onSort={c => toggleSort(prodSort, setProdSort, c)} />
                    ))}
                  </tr>
                    
                </thead>
                
                <tbody className="divide-y divide-white/5">
                  {prodRows.map((r, i) => (
                    <tr key={r.id} className="hover:bg-white/3 transition-colors">
                      <td className="py-3 pr-2"><Rank i={i} /></td>
                      <td className="py-3 pr-6 font-semibold text-slate-200">{r.name}</td>
                      <td className="py-3 pr-6 text-slate-300">{r.unitsSold.toLocaleString()}</td>
                      <td className="py-3 pr-6 font-bold text-cyan-400">{bdt(r.revenue)}</td>
                      <td className="py-3 pr-6 text-emerald-400">{bdt(r.profit)}</td>
                      <td className="py-3 text-slate-400">{r.txn}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {prodRows.length === 0 && (
                <p className="py-8 text-center text-slate-600 text-sm">No product data</p>
              )}
            </div>
          )}
        </div>

        {/* Employee Performance Table (unchanged) */}
        {isManagerPlus && (
          <div className="rounded-2xl border border-white/8 bg-[#0f1623] p-6 shadow-xl">
            <div className="mb-4">
              <h2 className="text-sm font-bold text-slate-200">Employee Performance</h2>
              <p className="text-xs text-slate-500 mt-0.5">Sales staff · selected period</p>
            </div>
            {loading ? <Sk h="h-40" /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/8">
                      <th className="pb-3 text-left text-xs text-slate-500 w-8">#</th>
                      {[
                        { label:'Employee',     col:'name'       },
                        { label:'Total Sales',  col:'totalSales' },
                        { label:'Revenue',      col:'revenue'    },
                        { label:'Units',        col:'units'      },
                        { label:'Avg per Sale', col:'avgPerSale' },
                      ].map(h => (
                        <SortTH key={h.col} label={h.label} col={h.col}
                          sortCol={empSort.col} sortDir={empSort.dir}
                          onSort={c => toggleSort(empSort, setEmpSort, c)} />
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {empRows.map((r, i) => (
                      <tr key={r.id} className="hover:bg-white/3 transition-colors">
                        <td className="py-3 pr-2"><Rank i={i} /></td>
                        <td className="py-3 pr-6 font-semibold text-slate-200">{r.name}</td>
                        <td className="py-3 pr-6 text-slate-300">{r.totalSales}</td>
                        <td className="py-3 pr-6 font-bold text-cyan-400">{bdt(r.revenue)}</td>
                        <td className="py-3 pr-6 text-slate-300">{r.units.toLocaleString()}</td>
                        <td className="py-3 text-slate-400">{bdt(r.avgPerSale)}</td>
                      </tr>
                    ))}
                    {empRows.length > 0 && (
                      <tr className="border-t-2 border-white/10 font-bold">
                        <td /><td className="pt-3 pr-6 text-xs uppercase text-slate-500">Total</td>
                        <td className="pt-3 pr-6 text-slate-300">{empRows.reduce((s,r)=>s+r.totalSales,0)}</td>
                        <td className="pt-3 pr-6 text-cyan-300">{bdt(empRows.reduce((s,r)=>s+r.revenue,0))}</td>
                        <td className="pt-3 pr-6 text-slate-300">{empRows.reduce((s,r)=>s+r.units,0).toLocaleString()}</td>
                        <td />
                      </tr>
                    )}
                  </tbody>
                </table>
                {empRows.length === 0 && (
                  <p className="py-8 text-center text-slate-600 text-sm">No employee data</p>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </Layout>
  );
}