'use client';

import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';

type Product = {
  id: number;
  name: string;
  price: number;
  stock: number;
};

type Sale = {
  id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  total: number;
  user_id: number;
  user_name: string;
  sale_date: string;
};

type Employee = {
  id: number;
  name: string;
};

type Me = {
  id: number;
  name: string;
  role: string;
};

const formatDhakaTime = (datetime?: string) => {
  if (!datetime) return '-';
  const isoStr = datetime.replace(' ', 'T');
  return new Date(isoStr).toLocaleString('en-US', {
    timeZone: 'Asia/Dhaka',
    hour12: true,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const bdt = (n: number) => '৳' + new Intl.NumberFormat('en-IN').format(Math.round(n));

export default function SaleEntryPage() {
  const [me,          setMe]          = useState<Me | null>(null);
  const [products,    setProducts]    = useState<Product[]>([]);
  const [productId,   setProductId]   = useState<number | null>(null);
  const [quantity,    setQuantity]    = useState(1);
  const [message,     setMessage]     = useState<{ text: string; ok: boolean } | null>(null);
  const [sales,       setSales]       = useState<Sale[]>([]);
  const [employees,   setEmployees]   = useState<Record<number, string>>({});
  const [showSalesList, setShowSalesList]   = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [submitting,  setSubmitting]  = useState(false);

  // ── Fetch logged-in user ─────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => { if (d.success) setMe(d.user); })
      .catch(() => {});
  }, []);

  // ── Fetch products ───────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/products')
      .then(r => r.json())
      .then(d => { if (d.success && Array.isArray(d.data)) setProducts(d.data); })
      .catch(() => setProducts([]));
  }, []);

  // ── Fetch sales + employees ──────────────────────────────────────────────
  const fetchSales = async () => {
    try {
      const [salesRes, empRes] = await Promise.all([
        fetch('/api/sales'),
        fetch('/api/users'),
      ]);
      const salesData = await salesRes.json();
      const empData   = await empRes.json();

      if (salesData.success && Array.isArray(salesData.data)) setSales(salesData.data);
      else setSales([]);

      if (empData.success && Array.isArray(empData.data)) {
        const map: Record<number, string> = {};
        empData.data.forEach((e: Employee) => { map[e.id] = e.name; });
        setEmployees(map);
      }
    } catch {
      setSales([]); setEmployees({});
    }
  };

  useEffect(() => { fetchSales(); }, []);

  // ── Submit sale ──────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!me) { setMessage({ text: 'Not logged in', ok: false }); return; }
    if (!productId || quantity <= 0) {
      setMessage({ text: 'Product and quantity are required', ok: false }); return;
    }

    setSubmitting(true);
    try {
      const res  = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: productId,
          quantity:   Number(quantity),
          user_id:    me.id,          // ← logged-in user, hardcoded নয়
        }),
      });
      const data = await res.json();
      setMessage({ text: data.message || 'Sale added', ok: data.success });
      if (data.success) {
        setQuantity(1);
        setProductId(null);
        await fetchSales();
        // product stock refresh
        const pr = await fetch('/api/products');
        const pd = await pr.json();
        if (pd.success) setProducts(pd.data);
      }
    } catch {
      setMessage({ text: 'Failed to add sale', ok: false });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete sale ──────────────────────────────────────────────────────────
  const handleDelete = async (id: number) => {
    try {
      const res  = await fetch('/api/sales', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      setMessage({ text: data.message || 'Sale deleted', ok: data.success });
      if (data.success) {
        setConfirmDeleteId(null);
        await fetchSales();
        const pr = await fetch('/api/products');
        const pd = await pr.json();
        if (pd.success) setProducts(pd.data);
      }
    } catch {
      setMessage({ text: 'Failed to delete sale', ok: false });
    }
  };

  const sortedSales = [...sales].sort((a, b) =>
    new Date(b.sale_date.replace(' ', 'T')).getTime() -
    new Date(a.sale_date.replace(' ', 'T')).getTime()
  );

  const selectedProduct = products.find(p => p.id === productId);
  const previewTotal    = selectedProduct ? selectedProduct.price * quantity : 0;

  return (
    <Layout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <p className="text-[10px] font-black tracking-[0.25em] uppercase text-emerald-400 mb-0.5">Transactions</p>
          <h1 className="text-2xl font-bold text-white">Sale Entry</h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Logged in as{' '}
            <span className="text-slate-300 font-semibold">{me?.name ?? '…'}</span>
            {me?.role && (
              <span className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase
                ${me.role === 'ADMIN'   ? 'bg-rose-500/15 text-rose-400' :
                  me.role === 'MANAGER' ? 'bg-blue-500/15 text-blue-400' :
                                          'bg-emerald-500/15 text-emerald-400'}`}>
                {me.role}
              </span>
            )}
          </p>
        </div>

        {/* ── Sale Form ── */}
        <div className="rounded-xl border border-white/8 bg-[#0d1117] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/6">
            <p className="text-sm font-bold text-white">New Sale</p>
          </div>
          <div className="p-5">
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Product select */}
              <div>
                <label className="text-[11px] font-bold tracking-widest uppercase text-slate-500 block mb-1.5">
                  Product
                </label>
                <select
                  value={productId ?? 0}
                  onChange={e => setProductId(Number(e.target.value) || null)}
                  className="w-full rounded-lg border border-white/8 bg-[#0a0e18] px-3.5 py-2.5
                             text-white text-sm focus:outline-none focus:border-emerald-500/50 transition-all"
                >
                  <option value={0}>— Select Product —</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} | ৳{p.price} | Stock: {p.stock}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity */}
              <div>
                <label className="text-[11px] font-bold tracking-widest uppercase text-slate-500 block mb-1.5">
                  Quantity
                </label>
                <input
                  type="number" min={1}
                  value={quantity}
                  onChange={e => setQuantity(Number(e.target.value))}
                  className="w-full rounded-lg border border-white/8 bg-[#0a0e18] px-3.5 py-2.5
                             text-white text-sm focus:outline-none focus:border-emerald-500/50 transition-all"
                />
              </div>

              {/* Preview total */}
              {selectedProduct && (
                <div className="flex items-center justify-between rounded-lg bg-emerald-500/8 border border-emerald-500/20 px-4 py-3">
                  <span className="text-xs text-emerald-400/70">Total Amount</span>
                  <span className="text-lg font-black text-emerald-400">{bdt(previewTotal)}</span>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit" disabled={submitting || !me}
                className="w-full py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500
                           text-white text-sm font-bold transition-all disabled:opacity-50
                           shadow-lg shadow-emerald-900/30 active:scale-[0.99]"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Adding…
                  </span>
                ) : 'Add Sale'}
              </button>

              {/* Message */}
              {message && (
                <p className={`text-xs font-semibold text-center ${message.ok ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {message.ok ? '✓' : '✕'} {message.text}
                </p>
              )}
            </form>
          </div>
        </div>

        {/* ── Toggle Sales History ── */}
        <div className="flex justify-center">
          <button
            onClick={() => setShowSalesList(v => !v)}
            className="px-5 py-2.5 rounded-lg border border-white/8 bg-white/[0.03]
                       text-slate-400 hover:text-white hover:border-white/15
                       text-sm font-semibold transition-all"
          >
            {showSalesList ? 'Hide Sales History' : 'View Sales History'}
          </button>
        </div>

        {/* ── Sales History ── */}
        {showSalesList && (
          <div className="space-y-3">
            <p className="text-xs text-slate-600 font-semibold">{sortedSales.length} records</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedSales.length === 0 ? (
                <div className="col-span-full rounded-xl border border-white/8 bg-[#0d1117] p-8 text-center text-sm text-slate-600">
                  No sales records found.
                </div>
              ) : sortedSales.map(s => (
                <div key={s.id}
                  className="rounded-xl border border-white/8 bg-[#0d1117] p-4 hover:border-white/15 transition-all group">

                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-sm font-bold text-slate-200 leading-tight">{s.product_name}</h3>
                    {new Date(s.sale_date.replace(' ', 'T')).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 flex-shrink-0 ml-2">
                        Recent
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Quantity</span>
                      <span className="font-semibold text-slate-300">{s.quantity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Amount</span>
                      <span className="font-black text-emerald-400">{bdt(s.total ?? 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Employee</span>
                      <span className="text-slate-400">{s.user_name}</span>
                    </div>
                    <div className="pt-2 border-t border-white/5 text-slate-700">
                      {formatDhakaTime(s.sale_date)}
                    </div>
                  </div>

                  {/* Delete */}
                  <div className="mt-3 flex justify-end">
                    {confirmDeleteId === s.id ? (
                      <div className="flex gap-2">
                        <button onClick={() => setConfirmDeleteId(null)}
                          className="px-3 py-1 rounded-lg border border-white/10 text-slate-400 text-xs hover:text-white transition-all">
                          Cancel
                        </button>
                        <button onClick={() => handleDelete(s.id)}
                          className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all">
                          Confirm
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDeleteId(s.id)}
                        className="opacity-0 group-hover:opacity-100 px-3 py-1 rounded-lg
                                   border border-rose-500/20 bg-rose-500/8 text-rose-400
                                   hover:bg-rose-500/15 text-xs font-semibold transition-all">
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}