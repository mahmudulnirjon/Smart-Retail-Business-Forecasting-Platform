'use client';

import { useEffect, useState } from "react";
import Layout from "../../components/Layout";

type Product = {
  id: number;
  name: string;
  price: number;
  stock: number;
  created_at?: string;
  updated_at?: string;
};

const formatDhakaTime = (datetime?: string) => {
  if (!datetime) return "-";
  return new Date(datetime).toLocaleString("en-US", {
    timeZone: "Asia/Dhaka",
    hour12: true,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

export default function ProductAddPage() {
  const [products, setProducts]                   = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | 'new'>('new');
  const [name, setName]                           = useState('');
  const [price, setPrice]                         = useState('');
  const [stock, setStock]                         = useState('');
  const [stockAction, setStockAction]             = useState<'add' | 'minus'>('add');
  const [message, setMessage]                     = useState('');
  const [messageType, setMessageType]             = useState<'success' | 'error'>('success');
  const [loading, setLoading]                     = useState(false);
  const [showDetails, setShowDetails]             = useState(false);
  const [confirmDeleteId, setConfirmDeleteId]     = useState<number | null>(null);

  const fetchProducts = async () => {
    try {
      const res  = await fetch('/api/products');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        const uniqueProducts: Product[] = Object.values(
          data.data.reduce((acc: Record<number, Product>, p: Product) => {
            if (!acc[p.id]) acc[p.id] = { ...p };
            else acc[p.id].stock += p.stock;
            return acc;
          }, {})
        );
        setProducts(uniqueProducts);
      }
    } catch { setProducts([]); }
  };

  useEffect(() => { fetchProducts(); }, []);

  const showMsg = (msg: string, type: 'success' | 'error' = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 4000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const body: any = selectedProductId === 'new'
        ? { name, price: Number(price), stock: Number(stock) }
        : {
            id:          selectedProductId,
            stock:       Number(stock),
            price:       price ? Number(price) : undefined,
            stockAction,
          };
      const res  = await fetch('/api/products', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });
      const data = await res.json();
      showMsg(data.message || '', data.success ? 'success' : 'error');
      if (data.success) {
        setName(''); setPrice(''); setStock('');
        setSelectedProductId('new');
        setStockAction('add');
        fetchProducts();
      }
    } catch {
      showMsg('Failed to process', 'error');
    } finally { setLoading(false); }
  };

  const handleDelete = async (id: number) => {
    try {
      const res  = await fetch('/api/products', {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id }),
      });
      const data = await res.json();
      showMsg(data.message || '', data.success ? 'success' : 'error');
      if (data.success) {
        setConfirmDeleteId(null);
        fetchProducts();
      }
    } catch {
      showMsg('Failed to delete product', 'error');
    }
  };

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const sortedProducts = [...products].sort((a, b) => {
    const dateA = a.updated_at ? new Date(a.updated_at) : (a.created_at ? new Date(a.created_at) : new Date(0));
    const dateB = b.updated_at ? new Date(b.updated_at) : (b.created_at ? new Date(b.created_at) : new Date(0));
    return dateB.getTime() - dateA.getTime();
  });

  return (
    <Layout>
      {/* Main container: full width, no max-width restriction, flex column to fill height */}
      <div className="p-6 md:p-8 min-h-[calc(100vh-120px)] flex flex-col">
        
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Add / Update Product</h1>
          <p className="text-slate-400 mt-1">Manage your product catalog – add new items or update stock/price</p>
        </div>

        {/* Two-column layout on large screens: form left, product list right? Actually better to keep form on top then grid below */}
        <div className="space-y-8">
          {/* Form card – wider, centered but not too narrow */}
          <div className="max-w-3xl mx-auto w-full rounded-xl border border-slate-700 bg-slate-800/60 p-6 shadow-lg">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Select Product</label>
                <select
                  value={selectedProductId}
                  onChange={(e) =>
                    setSelectedProductId(e.target.value === 'new' ? 'new' : Number(e.target.value))
                  }
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none transition
                             hover:border-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                >
                  <option value="new">-- Add New Product --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {selectedProductId === 'new' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Product Name</label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Wireless Mouse"
                      className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none transition
                                 hover:border-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Price (BDT)</label>
                    <input
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      type="number"
                      placeholder="e.g. 99.99"
                      className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none transition
                                 hover:border-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-lg border border-slate-600 bg-slate-700/40 px-4 py-2 text-sm text-slate-300">
                    <span className="font-semibold">Current:</span> {selectedProduct?.name} — Price: ৳{selectedProduct?.price} — Stock: {selectedProduct?.stock}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Update Price (optional)</label>
                    <input
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      type="number"
                      placeholder="Leave blank to keep current price"
                      className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none transition
                                 hover:border-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Stock Action</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setStockAction('add')}
                        className={`flex-1 rounded-lg border py-2 text-sm font-medium transition ${
                          stockAction === 'add'
                            ? 'border-green-500 bg-green-600/20 text-green-300'
                            : 'border-slate-600 bg-slate-800 text-slate-400 hover:border-slate-500'
                        }`}
                      >
                        + Add Stock
                      </button>
                      <button
                        type="button"
                        onClick={() => setStockAction('minus')}
                        className={`flex-1 rounded-lg border py-2 text-sm font-medium transition ${
                          stockAction === 'minus'
                            ? 'border-red-500 bg-red-600/20 text-red-300'
                            : 'border-slate-600 bg-slate-800 text-slate-400 hover:border-slate-500'
                        }`}
                      >
                        − Reduce Stock
                      </button>
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Quantity</label>
                <input
                  type="number"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  placeholder="Number of units"
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none transition
                             hover:border-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-900/30 transition
                           hover:bg-blue-500 active:scale-[0.98] disabled:opacity-50"
              >
                {loading
                  ? 'Processing...'
                  : selectedProductId === 'new'
                  ? 'Add Product'
                  : 'Update Stock & Price'}
              </button>

              {message && (
                <p className={`text-sm font-semibold ${messageType === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                  {message}
                </p>
              )}
            </form>
          </div>

          {/* Toggle button */}
          <div className="flex justify-center">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="rounded-lg border border-slate-600 bg-slate-800 px-5 py-2 text-sm font-medium text-slate-300 shadow-sm transition
                         hover:border-slate-500 hover:bg-slate-700 hover:text-slate-100"
            >
              {showDetails ? 'Hide Product List' : 'View Product List'}
            </button>
          </div>

          {/* Product list – responsive grid fills horizontal space */}
          {showDetails && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {sortedProducts.map((p) => (
                <div
                  key={p.id}
                  className="group relative rounded-xl border border-slate-700 bg-gradient-to-br from-slate-800/90 to-slate-800/40 p-4 shadow-md transition-all duration-200 hover:border-slate-500 hover:shadow-lg"
                >
                  <div className="flex flex-col h-full">
                    <div className="flex items-start justify-between">
                      <h3 className="text-lg font-bold text-slate-100">{p.name}</h3>
                      {p.updated_at && new Date(p.updated_at).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000 && (
                        <span className="inline-flex items-center rounded-full bg-blue-500/20 px-2 py-0.5 text-xs font-medium text-blue-300">
                          New
                        </span>
                      )}
                    </div>

                    <div className="mt-3 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">💰 Price:</span>
                        <span className="font-semibold text-slate-100">৳{p.price}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">📦 Stock:</span>
                        <span className={`font-semibold ${p.stock <= 10 ? 'text-red-400' : p.stock > 100 ? 'text-amber-400' : 'text-green-400'}`}>
                          {p.stock}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-700/50">
                        <div>➕ Added: {formatDhakaTime(p.created_at)}</div>
                        <div>🔄 Updated: {formatDhakaTime(p.updated_at)}</div>
                      </div>
                    </div>

                    <div className="mt-4 flex justify-end">
                      {confirmDeleteId === p.id ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="rounded-md border border-slate-600 bg-slate-700 px-2 py-1 text-xs text-slate-300"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="rounded-md bg-red-600 px-2 py-1 text-xs font-semibold text-white"
                          >
                            Confirm
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(p.id)}
                          className="rounded-md border border-red-600/40 bg-red-600/10 px-3 py-1 text-xs font-medium text-red-400 transition hover:border-red-500 hover:bg-red-600/20"
                        >
                          🗑 Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}