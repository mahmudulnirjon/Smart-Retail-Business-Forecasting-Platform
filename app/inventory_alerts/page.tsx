'use client';

import { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

type Product = {
  id: number;
  name: string;
  price: number;
  stock: number;
  low_stock_limit: number;
  over_stock_limit: number;
  alertType: string;
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
  });
};

export default function InventoryAlertPage() {
  const [products, setProducts]               = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [lowLimit, setLowLimit]               = useState(0);
  const [overLimit, setOverLimit]             = useState(0);
  const [message, setMessage]                 = useState("");
  const [msgType, setMsgType]                 = useState<"success" | "error">("success");
  const [showTable, setShowTable]             = useState(false);

  const fetchInventory = async () => {
    try {
      const res  = await fetch("/api/inventory");
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        const unique: Record<number, Product> = {};
        data.data.forEach((p: Product) => {
          if (!unique[p.id]) unique[p.id] = { ...p };
          else unique[p.id].stock += p.stock;
        });
        setProducts(Object.values(unique));
      }
    } catch { setProducts([]); }
  };

  useEffect(() => { fetchInventory(); }, []);

  const showMsg = (msg: string, type: "success" | "error" = "success") => {
    setMessage(msg); setMsgType(type);
    setTimeout(() => setMessage(""), 4000);
  };

  const handleUpdateLimits = async () => {
    if (!selectedProductId) return;
    try {
      const res  = await fetch("/api/inventory", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          product_id:      selectedProductId,
          low_stock_limit: lowLimit,
          over_stock_limit: overLimit,
        }),
      });
      const data = await res.json();
      showMsg(data.message || "", data.success ? "success" : "error");
      fetchInventory();
    } catch { showMsg("Failed to update limits", "error"); }
  };

  const lowCount    = products.filter(p => p.alertType === "Low Stock").length;
  const overCount   = products.filter(p => p.alertType === "Overstock").length;
  const normalCount = products.filter(p => p.alertType === "Normal").length;

  const pieData = {
    labels: ["Low Stock", "Normal", "Overstock"],
    datasets: [{
      data:            [lowCount, normalCount, overCount],
      backgroundColor: ["#ef4444", "#3b82f6", "#f59e0b"],
      borderColor:     ["#ef444433", "#3b82f633", "#f59e0b33"],
      borderWidth:     2,
      hoverOffset:     6,
    }],
  };

  const selectedProduct = products.find(p => p.id === selectedProductId);

  return (
    <Layout>
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold">Inventory Alerts</h1>

        {/* ── KPI Cards — side by side ── */}
        <div className="flex gap-4">
          <div className="flex-1 rounded-xl border border-red-500/20 bg-red-500/10 p-5">
            <p className="text-sm font-medium text-red-400">Low Stock</p>
            <p className="mt-2 text-3xl font-bold text-red-300">{lowCount}</p>
            <p className="mt-1 text-xs text-slate-500">Products below limit</p>
          </div>
          <div className="flex-1 rounded-xl border border-blue-500/20 bg-blue-500/10 p-5">
            <p className="text-sm font-medium text-blue-400">Normal</p>
            <p className="mt-2 text-3xl font-bold text-blue-300">{normalCount}</p>
            <p className="mt-1 text-xs text-slate-500">Products in range</p>
          </div>
          <div className="flex-1 rounded-xl border border-amber-500/20 bg-amber-500/10 p-5">
            <p className="text-sm font-medium text-amber-400">Overstock</p>
            <p className="mt-2 text-3xl font-bold text-amber-300">{overCount}</p>
            <p className="mt-1 text-xs text-slate-500">Products above limit</p>
          </div>
        </div>

        {/* ── Pie Chart + Limit Form side by side ── */}
        <div className="grid gap-4 md:grid-cols-2">

          {/* Pie chart */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <h2 className="mb-4 text-sm font-semibold text-slate-300">Stock Distribution</h2>
            <div className="flex justify-center">
              <div style={{ width: 300, height: 300 }}>
                <Pie
                  data={pieData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: "bottom",
                        labels: { color: "#94a3b8", font: { size: 11 }, padding: 12 },
                      },
                      tooltip: {
                        backgroundColor: "rgba(15,23,42,0.95)",
                        titleColor: "#e2e8f0",
                        bodyColor:  "#94a3b8",
                        borderColor: "rgba(255,255,255,0.1)",
                        borderWidth: 1,
                      },
                    },
                  }}
                />
              </div>
            </div>
          </div>

          {/* Limit update form */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-300">Update Stock Limits</h2>

            <select
              value={selectedProductId ?? 0}
              onChange={e => setSelectedProductId(Number(e.target.value) || null)}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none transition
                         hover:border-slate-500 focus:border-green-500 focus:ring-2 focus:ring-green-500/30
                         [&>option]:bg-slate-800 [&>option]:text-slate-100"
            >
              <option value={0}>-- Select Product --</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            {selectedProduct && (
              <>
                <div className="rounded-lg border border-white/5 bg-white/5 px-3 py-2 text-sm text-slate-300">
                  Current stock: <span className={`font-semibold ${
                    selectedProduct.alertType === "Low Stock" ? "text-red-400"
                    : selectedProduct.alertType === "Overstock" ? "text-amber-400"
                    : "text-blue-400"
                  }`}>{selectedProduct.stock}</span>
                  &nbsp;·&nbsp; Low: {selectedProduct.low_stock_limit}
                  &nbsp;·&nbsp; Over: {selectedProduct.over_stock_limit}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">Low Stock Limit</label>
                    <input
                      type="number"
                      value={lowLimit}
                      onChange={e => setLowLimit(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none transition
                                 focus:border-red-500 focus:ring-2 focus:ring-red-500/30"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">Over Stock Limit</label>
                    <input
                      type="number"
                      value={overLimit}
                      onChange={e => setOverLimit(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none transition
                                 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30"
                    />
                  </div>
                </div>
              </>
            )}

            <button
              onClick={handleUpdateLimits}
              className="w-full rounded-lg bg-green-600 py-2 text-sm font-semibold text-white shadow-md shadow-green-900/30 transition
                         hover:bg-green-500 active:scale-[0.98]"
            >
              Save Limits
            </button>

            {message && (
              <p className={`text-sm font-semibold ${msgType === "success" ? "text-green-400" : "text-red-400"}`}>
                {message}
              </p>
            )}
          </div>
        </div>

        {/* ── See Details toggle ── */}
        <button
          onClick={() => setShowTable(!showTable)}
          className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm text-slate-300 shadow-sm transition
                     hover:border-slate-500 hover:bg-slate-700 hover:text-slate-100"
        >
          {showTable ? "Hide Details" : "See Details"}
        </button>

        {/* ── Details Table ── */}
        {showTable && (
          <div className="rounded-xl border border-white/10 bg-white/5 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs text-slate-400">
                  <th className="px-4 py-3 font-medium">ID</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium">Stock</th>
                  <th className="px-4 py-3 font-medium">Low Limit</th>
                  <th className="px-4 py-3 font-medium">Over Limit</th>
                  <th className="px-4 py-3 font-medium">Alert</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                    <td className="px-4 py-3 text-slate-500">{p.id}</td>
                    <td className="px-4 py-3 font-medium text-slate-100">{p.name}</td>
                    <td className="px-4 py-3 text-slate-300">৳{p.price}</td>
                    <td className="px-4 py-3 text-slate-300">{p.stock}</td>
                    <td className="px-4 py-3 text-slate-300">{p.low_stock_limit}</td>
                    <td className="px-4 py-3 text-slate-300">{p.over_stock_limit}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        p.alertType === "Low Stock"
                          ? "bg-red-500/20 text-red-300"
                          : p.alertType === "Overstock"
                          ? "bg-amber-500/20 text-amber-300"
                          : "bg-blue-500/20 text-blue-300"
                      }`}>
                        {p.alertType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{formatDhakaTime(p.created_at)}</td>
                    <td className="px-4 py-3 text-slate-400">{formatDhakaTime(p.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}