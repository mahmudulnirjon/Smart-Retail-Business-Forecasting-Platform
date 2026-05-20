'use client';

import { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler
);

type Forecast = {
  summary: {
    predictedRevenue30Days: string;
    predictedUnits30Days: string;
    topPredictedProduct: string;
    profitNextMonth: string;
  };
  dailySales: { date: string; quantity: number; lower?: number; upper?: number }[];
  monthlyRevenue: { month: string; revenue: number; prevRevenue?: number }[];
  topProducts: { name: string; predictedQuantity: number }[];
  profitTrend: { month: string; profit: number }[];
  insights: {
    dailySales?: string;
    monthlyRevenue?: string;
    topProducts?: string;
    profitTrend?: string;
  };
};

// Loading Spinner Component
function Spinner() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-14 h-14 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      <p className="text-lg font-medium text-gray-600">
        🤖 AI is analyzing data...
      </p>
      <p className="text-sm text-gray-400">This may take a few seconds</p>
    </div>
  );
}

// Summary Card Component
function SummaryCard({
  title,
  value,
  color,
}: {
  title: string;
  value: string;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    green: "bg-green-50 text-green-700 border-green-200",
    yellow: "bg-yellow-50 text-yellow-700 border-yellow-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
  };

  return (
    <div
      className={`rounded-2xl p-5 shadow border transition-shadow duration-200 hover:shadow-lg ${colorMap[color]}`}
    >
      <h3 className="text-sm font-semibold mb-2 opacity-80">{title}</h3>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

// Chart Card Component
function ChartCard({
  title,
  insight,
  children,
  fullWidth = false,
}: {
  title: string;
  insight?: string;
  children: React.ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <div
      className={`bg-white rounded-2xl p-5 shadow border border-gray-100 ${
        fullWidth ? "md:col-span-2" : ""
      }`}
    >
      <h3 className="font-bold text-gray-800 mb-3 text-base">{title}</h3>
      {/* Fixed height chart container */}
      <div style={{ height: "280px" }}>{children}</div>
      {insight && (
        <p className="mt-3 text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
          💡 {insight}
        </p>
      )}
    </div>
  );
}

export default function ForecastPage() {
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchForecast = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/forecast");
        const data = await res.json();
        if (data.success) {
          setForecast(data.data);
        } else {
          setError("AI analysis unavailable, please try again later.");
        }
      } catch {
        setError("AI analysis unavailable, please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchForecast();
  }, []);

  if (loading) return <Layout><Spinner /></Layout>;

  if (error) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center bg-red-50 border border-red-200 rounded-2xl p-8">
            <p className="text-red-600 font-semibold text-lg">⚠️ {error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              Try Again
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  if (!forecast) return null;

  // Chart Datasets
  const dailySalesData = {
    labels: forecast.dailySales.map((d) => d.date),
    datasets: [
      {
        label: "Predicted Units Sold",
        data: forecast.dailySales.map((d) => d.quantity),
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59,130,246,0.1)",
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 6,
      },
    ],
  };

  const monthlyRevenueData = {
    labels: forecast.monthlyRevenue.map((m) => m.month),
    datasets: [
      {
        label: "Predicted Revenue",
        data: forecast.monthlyRevenue.map((m) => m.revenue),
        backgroundColor: "rgba(248,113,113,0.85)",
        borderRadius: 6,
      },
      {
        label: "Previous Revenue",
        data: forecast.monthlyRevenue.map((m) => m.prevRevenue || 0),
        backgroundColor: "rgba(96,165,250,0.85)",
        borderRadius: 6,
      },
    ],
  };

  const topProductsData = {
    labels: forecast.topProducts.map((p) => p.name),
    datasets: [
      {
        label: "Predicted Quantity",
        data: forecast.topProducts.map((p) => p.predictedQuantity),
        backgroundColor: "rgba(52,211,153,0.85)",
        borderRadius: 6,
      },
    ],
  };

  const profitTrendData = {
    labels: forecast.profitTrend.map((p) => p.month),
    datasets: [
      {
        label: "Profit (৳)",
        data: forecast.profitTrend.map((p) => p.profit),
        borderColor: "#f59e0b",
        backgroundColor: "rgba(245,158,11,0.1)",
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 7,
      },
    ],
  };

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top" as const, labels: { font: { size: 12 } } },
      tooltip: { mode: "index" as const, intersect: false },
    },
    scales: {
      x: { grid: { display: false } },
      y: { grid: { color: "rgba(0,0,0,0.05)" } },
    },
  };

  return (
    <Layout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            🤖 AI Forecasting Dashboard
          </h1>
          <p className="text-gray-500 mt-1">
            Predictions based on historical data
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard
            title="Predicted Revenue (30 days)"
            value={forecast.summary.predictedRevenue30Days}
            color="blue"
          />
          <SummaryCard
            title="Predicted Units Sold"
            value={forecast.summary.predictedUnits30Days}
            color="green"
          />
          <SummaryCard
            title="Top Predicted Product"
            value={forecast.summary.topPredictedProduct}
            color="yellow"
          />
          <SummaryCard
            title="Profit Forecast (Next Month)"
            value={forecast.summary.profitNextMonth}
            color="purple"
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Daily Sales Line Chart */}
          <ChartCard
            title="📈 Next 30 Days Sales Forecast"
            insight={forecast.insights.dailySales}
          >
            <Line data={dailySalesData} options={commonOptions} />
          </ChartCard>

          {/* Monthly Revenue Bar Chart */}
          <ChartCard
            title="💰 Monthly Revenue Forecast"
            insight={forecast.insights.monthlyRevenue}
          >
            <Bar data={monthlyRevenueData} options={commonOptions} />
          </ChartCard>

          {/* Top Products Horizontal Bar */}
          <ChartCard
            title="🏆 Top 5 Products Predicted Demand"
            insight={forecast.insights.topProducts}
            fullWidth
          >
            <Bar
              data={topProductsData}
              options={{ ...commonOptions, indexAxis: "y" }}
            />
          </ChartCard>

          {/* Profit Trend Line Chart */}
          <ChartCard
            title="📊 Profit Trend (Past 8 months + Next 3 months)"
            insight={forecast.insights.profitTrend}
            fullWidth
          >
            <Line data={profitTrendData} options={commonOptions} />
          </ChartCard>
        </div>
      </div>
    </Layout>
  );
}
