'use client';

import { useEffect, useState, useMemo } from "react";
import Layout from "../../components/Layout";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

// ─── Types ────────────────────────────────────────────────────────────────────

type Expense = {
  id: number;
  category: string;
  amount: number;
  note?: string;
  created_at: string;
  updated_at?: string;
};

type FilterPeriod = 'today' | 'week' | 'month' | 'year' | 'all';

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  "Rent", "Salary", "Utilities", "Marketing",
  "Transport", "Maintenance", "Supplies", "Others",
];

const CATEGORY_COLORS: Record<string, string> = {
  Rent:        "#3b82f6",
  Salary:      "#a855f7",
  Utilities:   "#f59e0b",
  Marketing:   "#ec4899",
  Transport:   "#06b6d4",
  Maintenance: "#ef4444",
  Supplies:    "#22c55e",
  Others:      "#94a3b8",
};

const getColor = (cat: string) => CATEGORY_COLORS[cat] ?? "#94a3b8";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDhakaTime = (datetime?: string) => {
  if (!datetime) return "-";
  const isoStr = datetime.replace(" ", "T");
  return new Date(isoStr).toLocaleString("en-US", {
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

const formatBDT = (n: number) =>
  "৳ " + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);

// ─── Filter Button Component ───────────────────────────────────────────────────

function FilterBtn({ active, onClick, label }: {
  active: boolean; onClick: () => void; label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
        active
          ? "bg-blue-600 text-white shadow"
          : "text-slate-400 hover:text-slate-200"
      }`}
    >
      {label}
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ExpensePage() {
  const [expenses, setExpenses]             = useState<Expense[]>([]);
  const [category, setCategory]             = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [amount, setAmount]                 = useState("");
  const [note, setNote]                     = useState("");
  const [message, setMessage]               = useState("");
  const [msgType, setMsgType]               = useState<"success" | "error">("success");
  const [filter, setFilter]                 = useState<FilterPeriod>("all");

  const finalCategory = category === "Others" ? customCategory.trim() : category;

  const fetchExpenses = async (period: FilterPeriod) => {
    try {
      const res  = await fetch(`/api/expenses?filter=${period}`);
      const data = await res.json();
      if (data.success) setExpenses(data.data || []);
    } catch { setExpenses([]); }
  };

  useEffect(() => {
    fetchExpenses(filter);
  }, [filter]); // re-fetch when filter changes

  const showMsg = (msg: string, type: "success" | "error" = "success") => {
    setMessage(msg); setMsgType(type);
    setTimeout(() => setMessage(""), 4000);
  };

  // ── Add expense ─────────────────────────────────────────────────────────
  const handleAdd = async () => {
    if (!finalCategory || !amount) {
      return showMsg("Category and amount required", "error");
    }
    if (category === "Others" && !customCategory.trim()) {
      return showMsg("Please enter a category name", "error");
    }

    const res  = await fetch("/api/expenses", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ category: finalCategory, amount: Number(amount), note }),
    });
    const data = await res.json();
    showMsg(data.message || "", data.success ? "success" : "error");
    if (data.success) {
      setCategory(""); setCustomCategory(""); setAmount(""); setNote("");
      fetchExpenses(filter); // refresh with current filter
    }
  };

  // ── Clear all ───────────────────────────────────────────────────────────
  const handleClear = async () => {
    try {
      await Promise.all(
        expenses.map((exp) =>
          fetch("/api/expenses", {
            method:  "DELETE",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ id: exp.id }),
          })
        )
      );
      fetchExpenses(filter);
      showMsg("All expense data cleared");
    } catch { showMsg("Failed to clear data", "error"); }
  };

  // ── Chart data — aggregate by category ─────────────────────────────────
  const chartData = useMemo(() => {
    const totals: Record<string, number> = {};
    expenses.forEach((e) => {
      totals[e.category] = (totals[e.category] || 0) + Number(e.amount);
    });

    const labels = Object.keys(totals);
    const values = Object.values(totals);
    const colors = labels.map((l) => getColor(l));

    return {
      labels,
      datasets: [
        {
          label: "Total Expense (৳)",
          data:  values,
          backgroundColor: colors.map((c) => c + "cc"),
          borderColor:     colors,
          borderWidth:     1.5,
          borderRadius:    6,
        },
      ],
    };
  }, [expenses]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(15,23,42,0.95)",
        titleColor:      "#e2e8f0",
        bodyColor:       "#94a3b8",
        borderColor:     "rgba(255,255,255,0.1)",
        borderWidth:     1,
        callbacks: {
          label: (ctx: any) => ` ${formatBDT(ctx.parsed.y)}`,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: "#94a3b8", font: { size: 11 } },
        grid:  { color: "rgba(255,255,255,0.05)" },
      },
      y: {
        ticks: {
          color: "#94a3b8",
          font:  { size: 11 },
          callback: (v: any) => "৳" + Intl.NumberFormat("en-IN").format(v),
        },
        grid: { color: "rgba(255,255,255,0.05)" },
      },
    },
  };

  const totalExpense = expenses.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <Layout>
      {/* Main container: full width, flex column, remove max-width constraint */}
      <div className="p-6 md:p-8 min-h-[calc(100vh-120px)] flex flex-col">
        
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Expense Tracking</h1>
          <p className="text-slate-400 mt-1">Record and analyze business expenses</p>
        </div>

        <div className="space-y-8">
          {/* Form card – wider, centered */}
          <div className="max-w-3xl mx-auto w-full rounded-xl border border-slate-700 bg-slate-800/60 p-6 shadow-lg space-y-5">

            {/* Category select */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setCustomCategory("");
                }}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none transition
                           hover:border-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
              >
                <option value="">-- Select Category --</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {category === "Others" && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Custom Category Name</label>
                <input
                  autoFocus
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="Enter category name…"
                  className="w-full rounded-lg border border-slate-500 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none transition
                             focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Amount (BDT)</label>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                type="number"
                placeholder="e.g. 5000"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none transition
                           hover:border-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Note (optional)</label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a reference or description"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none transition
                           hover:border-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
              />
            </div>

            <button
              onClick={handleAdd}
              className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-900/30 transition
                         hover:bg-blue-500 active:scale-[0.98]"
            >
              Add Expense
            </button>

            {message && (
              <p className={`text-sm font-semibold ${msgType === "success" ? "text-green-400" : "text-red-400"}`}>
                {message}
              </p>
            )}
          </div>

          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-1 rounded-xl border border-white/8 bg-white/5 p-1 justify-center">
            <FilterBtn active={filter === "today"} onClick={() => setFilter("today")} label="Today" />
            <FilterBtn active={filter === "week"}  onClick={() => setFilter("week")}  label="Last Week" />
            <FilterBtn active={filter === "month"} onClick={() => setFilter("month")} label="Last Month" />
            <FilterBtn active={filter === "year"}  onClick={() => setFilter("year")}  label="Last Year" />
            <FilterBtn active={filter === "all"}   onClick={() => setFilter("all")}   label="All Time" />
          </div>

          {/* Bar Chart – full width */}
          {expenses.length > 0 && (
            <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-5 shadow-lg">
              <div className="mb-1 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-300">Expense by Category</h2>
                <span className="text-sm font-bold text-red-400">{formatBDT(totalExpense)}</span>
              </div>
              <div className="h-64 md:h-72">
                <Bar data={chartData} options={chartOptions as any} />
              </div>
            </div>
          )}

          {/* Expense History Table – now full width with horizontal scroll on small screens */}
          <div className="rounded-xl border border-slate-700 bg-slate-800/60 shadow-lg overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-left text-xs text-slate-400">
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Note</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody>
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      No expenses recorded for selected period.
                    </td>
                  </tr>
                ) : (
                  expenses.map((exp) => (
                    <tr key={exp.id} className="border-b border-slate-700/50 transition-colors hover:bg-white/3">
                      <td className="px-4 py-3">
                        <span
                          className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                          style={{
                            background: getColor(exp.category) + "22",
                            color:      getColor(exp.category),
                          }}
                        >
                          {exp.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-red-400">
                        {formatBDT(exp.amount)}
                      </td>
                      <td className="px-4 py-3 text-slate-400">{exp.note || "-"}</td>
                      <td className="px-4 py-3 text-slate-400">{formatDhakaTime(exp.created_at)}</td>
                      <td className="px-4 py-3 text-slate-400">
                        {exp.updated_at ? formatDhakaTime(exp.updated_at) : "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Clear All button */}
          {expenses.length > 0 && (
            <div className="flex justify-center">
              <button
                onClick={handleClear}
                className="rounded-lg border border-red-600/40 bg-red-600/10 px-6 py-2 text-sm font-semibold text-red-400 shadow-sm transition
                           hover:border-red-500 hover:bg-red-600/20 hover:text-red-300 active:scale-[0.98]"
              >
                Clear All Expenses (current filter)
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}