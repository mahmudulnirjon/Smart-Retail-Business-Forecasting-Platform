'use client';

import { useEffect, useState, useCallback } from "react";
import Layout from "../../components/Layout";

type AnomalyType = "sales_spike" | "revenue_drop" | "suspicious_expense";
type Severity    = "high" | "medium" | "low";

type Anomaly = {
  type:        AnomalyType;
  severity:    Severity;
  title:       string;
  description: string;
  value:       string;
  date:        string;
};

// ── Config ────────────────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<AnomalyType, { icon: string; label: string; bg: string; border: string }> = {
  sales_spike:         { icon: "📈", label: "Sales Spike",         bg: "bg-orange-500/10", border: "border-orange-500/30" },
  revenue_drop:        { icon: "📉", label: "Revenue Drop",        bg: "bg-red-500/10",    border: "border-red-500/30"    },
  suspicious_expense:  { icon: "💸", label: "Suspicious Expense",  bg: "bg-yellow-500/10", border: "border-yellow-500/30" },
};

const SEVERITY_CONFIG: Record<Severity, { label: string; color: string; dot: string }> = {
  high:   { label: "High",   color: "text-red-400 bg-red-400/10 border-red-400/30",     dot: "bg-red-400"    },
  medium: { label: "Medium", color: "text-orange-400 bg-orange-400/10 border-orange-400/30", dot: "bg-orange-400" },
  low:    { label: "Low",    color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30", dot: "bg-yellow-400" },
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function AnomalyPage() {
  const [anomalies, setAnomalies]   = useState<Anomaly[]>([]);
  const [loading, setLoading]       = useState(true);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [filterType, setFilterType] = useState<AnomalyType | "all">("all");
  const [filterSev,  setFilterSev]  = useState<Severity | "all">("all");

  // Threshold state
  const [thresholds, setThresholds] = useState({
    salesSpike:   50,
    revenueDrop:  30,
    expenseSpike: 40,
  });
  const [tempThresholds, setTempThresholds] = useState({ ...thresholds });
  const [showSettings, setShowSettings]     = useState(false);

  const fetchAnomalies = useCallback(async (t = thresholds) => {
    setLoading(true);
    setBannerDismissed(false);
    try {
      const params = new URLSearchParams({
        salesSpike:   String(t.salesSpike),
        revenueDrop:  String(t.revenueDrop),
        expenseSpike: String(t.expenseSpike),
      });
      const res  = await fetch(`/api/anomaly?${params}`);
      const data = await res.json();
      if (data.success) setAnomalies(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [thresholds]);

  useEffect(() => { fetchAnomalies(); }, []);

  const applyThresholds = () => {
    setThresholds(tempThresholds);
    setShowSettings(false);
    fetchAnomalies(tempThresholds);
  };

  const highCount   = anomalies.filter(a => a.severity === "high").length;
  const filtered    = anomalies.filter(a =>
    (filterType === "all" || a.type === filterType) &&
    (filterSev  === "all" || a.severity === filterSev)
  );

  return (
    <Layout>
      <div className="min-h-screen bg-[#0a0d14]">

        {/* ── Warning Banner (top of page) ─────────────────────────────── */}
        {!bannerDismissed && anomalies.length > 0 && (
          <div className={`w-full px-6 py-3 flex items-center justify-between gap-4
            ${highCount > 0
              ? "bg-red-600/20 border-b border-red-500/40"
              : "bg-yellow-600/20 border-b border-yellow-500/40"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl animate-pulse">{highCount > 0 ? "🚨" : "⚠️"}</span>
              <p className={`text-sm font-semibold ${highCount > 0 ? "text-red-300" : "text-yellow-300"}`}>
                {highCount > 0
                  ? `${highCount} high-severity anomaly${highCount > 1 ? "ies" : ""} detected — immediate attention required!`
                  : `${anomalies.length} anomaly${anomalies.length > 1 ? "ies" : ""} detected — please review.`
                }
              </p>
            </div>
            <button
              onClick={() => setBannerDismissed(true)}
              className="text-slate-400 hover:text-white text-lg leading-none flex-shrink-0"
            >
              ✕
            </button>
          </div>
        )}

        <div className="p-6 max-w-7xl mx-auto space-y-6">

          {/* ── Header ───────────────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">🔍 Anomaly Detection</h1>
              <p className="text-slate-400 mt-1 text-sm">
                Monitoring unusual patterns in sales, revenue & expenses
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => fetchAnomalies()}
                className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 text-sm font-semibold transition"
              >
                🔄 Refresh
              </button>
              <button
                onClick={() => { setTempThresholds(thresholds); setShowSettings(true); }}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition"
              >
                ⚙️ Thresholds
              </button>
            </div>
          </div>

          {/* ── Threshold Settings Modal ──────────────────────────────────── */}
          {showSettings && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
              <div className="bg-[#1a1f2e] border border-white/10 rounded-2xl p-8 shadow-2xl w-full max-w-md mx-4">
                <h2 className="text-xl font-bold text-white mb-1">⚙️ Detection Thresholds</h2>
                <p className="text-slate-400 text-sm mb-6">
                  Set sensitivity levels for anomaly detection
                </p>

                <div className="space-y-5">
                  {/* Sales Spike */}
                  <div>
                    <label className="text-sm font-semibold text-slate-300 block mb-1">
                      📈 Sales Spike Threshold
                    </label>
                    <p className="text-xs text-slate-500 mb-2">
                      Alert if daily sales are X% above 30-day average
                    </p>
                    <div className="flex items-center gap-3">
                      <input
                        type="range" min={10} max={200} step={5}
                        value={tempThresholds.salesSpike}
                        onChange={e => setTempThresholds(p => ({ ...p, salesSpike: Number(e.target.value) }))}
                        className="flex-1 accent-orange-500"
                      />
                      <span className="w-16 text-right font-bold text-orange-400">
                        {tempThresholds.salesSpike}%
                      </span>
                    </div>
                  </div>

                  {/* Revenue Drop */}
                  <div>
                    <label className="text-sm font-semibold text-slate-300 block mb-1">
                      📉 Revenue Drop Threshold
                    </label>
                    <p className="text-xs text-slate-500 mb-2">
                      Alert if daily revenue is X% below 30-day average
                    </p>
                    <div className="flex items-center gap-3">
                      <input
                        type="range" min={10} max={100} step={5}
                        value={tempThresholds.revenueDrop}
                        onChange={e => setTempThresholds(p => ({ ...p, revenueDrop: Number(e.target.value) }))}
                        className="flex-1 accent-red-500"
                      />
                      <span className="w-16 text-right font-bold text-red-400">
                        {tempThresholds.revenueDrop}%
                      </span>
                    </div>
                  </div>

                  {/* Expense Spike */}
                  <div>
                    <label className="text-sm font-semibold text-slate-300 block mb-1">
                      💸 Expense Spike Threshold
                    </label>
                    <p className="text-xs text-slate-500 mb-2">
                      Alert if monthly expense category is X% above average
                    </p>
                    <div className="flex items-center gap-3">
                      <input
                        type="range" min={10} max={200} step={5}
                        value={tempThresholds.expenseSpike}
                        onChange={e => setTempThresholds(p => ({ ...p, expenseSpike: Number(e.target.value) }))}
                        className="flex-1 accent-yellow-500"
                      />
                      <span className="w-16 text-right font-bold text-yellow-400">
                        {tempThresholds.expenseSpike}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-8">
                  <button
                    onClick={() => setShowSettings(false)}
                    className="flex-1 py-3 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 transition font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={applyThresholds}
                    className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition"
                  >
                    Apply & Scan
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── KPI Summary Cards ─────────────────────────────────────────── */}
          <div className="space-y-4">
            {/* Row 1: Total Anomalies full width */}
            <div className="rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 p-5 shadow-lg flex items-center gap-5 w-full">
              <div className="text-4xl">🔍</div>
              <div>
                 <p className="text-white/70 text-lg font-medium">Total Anomalies</p>
    <p className="text-white text-4xl font-bold">{loading ? "—" : anomalies.length}</p>
              </div>
            </div>

            {/* Row 2: High / Medium / Low side by side */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
              {[
                { label: "High Severity",   value: anomalies.filter(a => a.severity === "high").length,   icon: "🚨", color: "from-red-700 to-red-900"      },
                { label: "Medium Severity", value: anomalies.filter(a => a.severity === "medium").length, icon: "⚠️", color: "from-orange-700 to-orange-900" },
                { label: "Low Severity",    value: anomalies.filter(a => a.severity === "low").length,    icon: "💡", color: "from-yellow-700 to-yellow-900" },
              ].map((kpi, i) => (
                <div key={i} className={`rounded-2xl bg-gradient-to-br ${kpi.color} p-4 shadow-lg`}>
                  <div className="text-2xl mb-1">{kpi.icon}</div>
                  <p className="text-white/70 text-xs font-medium">{kpi.label}</p>
                  <p className="text-white text-2xl font-bold">{loading ? "—" : kpi.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Current Thresholds Info ───────────────────────────────────── */}
          <div className="flex flex-wrap gap-3 text-xs">
            <span className="px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 font-medium">
              📈 Sales Spike: &gt;{thresholds.salesSpike}% above avg
            </span>
            <span className="px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 font-medium">
              📉 Revenue Drop: &gt;{thresholds.revenueDrop}% below avg
            </span>
            <span className="px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 font-medium">
              💸 Expense Spike: &gt;{thresholds.expenseSpike}% above avg
            </span>
          </div>

          {/* ── Filters ───────────────────────────────────────────────────── */}
          <div className="flex flex-wrap gap-3">
            {/* Type filter */}
            <div className="flex gap-2">
              {(["all", "sales_spike", "revenue_drop", "suspicious_expense"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border
                    ${filterType === t
                      ? "bg-blue-600 text-white border-blue-500"
                      : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10"
                    }`}
                >
                  {t === "all" ? "All Types" : TYPE_CONFIG[t].icon + " " + TYPE_CONFIG[t].label}
                </button>
              ))}
            </div>

            {/* Severity filter */}
            <div className="flex gap-2">
              {(["all", "high", "medium", "low"] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setFilterSev(s)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border
                    ${filterSev === s
                      ? "bg-blue-600 text-white border-blue-500"
                      : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10"
                    }`}
                >
                  {s === "all" ? "All Severity" : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* ── Anomaly List ──────────────────────────────────────────────── */}
          {loading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="rounded-2xl bg-white/5 border border-white/10 p-5 animate-pulse h-28" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24">
              <p className="text-5xl mb-4">✅</p>
              <p className="text-xl font-bold text-white mb-2">No Anomalies Detected</p>
              <p className="text-slate-400 text-sm">
                Everything looks normal with the current threshold settings.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((anomaly, i) => {
                const typeConf = TYPE_CONFIG[anomaly.type];
                const sevConf  = SEVERITY_CONFIG[anomaly.severity];
                return (
                  <div
                    key={i}
                    className={`rounded-2xl border p-5 transition-all hover:shadow-lg ${typeConf.bg} ${typeConf.border}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        {/* Icon */}
                        <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center text-xl flex-shrink-0">
                          {typeConf.icon}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="text-base font-bold text-white">{anomaly.title}</h3>
                            {/* Severity badge */}
                            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${sevConf.color}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${sevConf.dot}`} />
                              {sevConf.label}
                            </span>
                            {/* Type badge */}
                            <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-white/10 text-slate-300 border border-white/10">
                              {typeConf.label}
                            </span>
                          </div>
                          <p className="text-sm text-slate-300 mb-2 leading-relaxed">
                            {anomaly.description}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-slate-400">
                            <span>📊 {anomaly.value}</span>
                            <span>📅 {anomaly.date}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}