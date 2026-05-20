'use client';

import { useEffect, useState } from "react";
import Layout from "../../components/Layout";

type Product = {
  id: number;
  name: string;
  price: number;
  stock: number;
  low_stock_limit: number;
  over_stock_limit: number;
  created_at?: string;
  updated_at?: string;
};

export default function ProductPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setProducts(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch products:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteId }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Product deleted successfully", "success");
        setProducts(prev => prev.filter(p => p.id !== deleteId));
      } else {
        showToast(data.message || "Failed to delete", "error");
      }
    } catch {
      showToast("Something went wrong", "error");
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const getStockStatus = (p: Product) => {
    if (p.stock <= p.low_stock_limit) return { label: "Low Stock", color: "text-red-400 bg-red-400/10 border-red-400/20" };
    if (p.stock >= p.over_stock_limit) return { label: "Overstock", color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" };
    return { label: "In Stock", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" };
  };

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold transition-all
          ${toast.type === "success" ? "bg-emerald-500 text-white" : "bg-red-500 text-white"}`}>
          {toast.type === "success" ? "✅" : "❌"} {toast.msg}
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1a1f2e] border border-white/10 rounded-2xl p-8 shadow-2xl max-w-sm w-full mx-4">
            <div className="text-4xl mb-4 text-center">🗑️</div>
            <h3 className="text-xl font-bold text-white text-center mb-2">Delete Product?</h3>
            <p className="text-slate-400 text-center text-sm mb-6">
              This will permanently delete the product and all its sales records from the database.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-3 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 transition font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold transition disabled:opacity-60"
              >
                {deleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Products</h1>
            <p className="text-slate-400 mt-1 text-sm">
              {products.length} total products in inventory
            </p>
          </div>

          {/* Search */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">🔍</span>
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:bg-white/8 transition w-64"
            />
          </div>
        </div>



        {/* Product Grid */}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-2xl bg-white/5 border border-white/10 p-5 animate-pulse h-48" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <p className="text-5xl mb-4">📭</p>
            <p className="text-lg font-medium">No products found</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => {
              const status = getStockStatus(p);
              return (
                <div
                  key={p.id}
                  className="group rounded-2xl border border-white/10 bg-white/5 hover:bg-white/8 hover:border-white/20 p-5 transition-all duration-200 hover:shadow-xl relative"
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-500 mb-0.5">ID: #{p.id}</p>
                      <h3 className="text-base font-bold text-white leading-tight truncate pr-2">
                        {p.name}
                      </h3>
                    </div>
                    {/* Delete button */}
                    <button
                      onClick={() => setDeleteId(p.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 flex-shrink-0 w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/30 border border-red-500/20 flex items-center justify-center text-red-400 hover:text-red-300"
                      title="Delete product"
                    >
                      🗑️
                    </button>
                  </div>

                  {/* Price */}
                  <p className="text-2xl font-bold text-white mb-3">
                    ৳ {Number(p.price).toLocaleString('en-IN')}
                  </p>

                  {/* Stock info */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">Stock</p>
                      <p className="text-base font-semibold text-slate-200">
                        {p.stock} units
                      </p>
                    </div>
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${status.color}`}>
                      {status.label}
                    </span>
                  </div>

                  {/* Stock bar */}
                  <div className="mt-3">
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          p.stock <= p.low_stock_limit
                            ? 'bg-red-500'
                            : p.stock >= p.over_stock_limit
                            ? 'bg-yellow-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{
                          width: `${Math.min(100, (p.stock / p.over_stock_limit) * 100)}%`
                        }}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px] text-slate-600">Min: {p.low_stock_limit}</span>
                      <span className="text-[10px] text-slate-600">Max: {p.over_stock_limit}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}