import { NextResponse } from "next/server";
import { db } from "../../../lib/db";

// ── GET — Detect anomalies based on thresholds ────────────────────────────────
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    // Thresholds from query params (with defaults)
    const salesSpikePercent   = Number(searchParams.get("salesSpike")   ?? 50);  // % above avg
    const revenueDropPercent  = Number(searchParams.get("revenueDrop")  ?? 30);  // % below avg
    const expenseSpikePercent = Number(searchParams.get("expenseSpike") ?? 40);  // % above avg monthly expense

    const anomalies: {
      type: "sales_spike" | "revenue_drop" | "suspicious_expense";
      severity: "high" | "medium" | "low";
      title: string;
      description: string;
      value: string;
      date: string;
    }[] = [];

    // ─── 1. Sales Spike Detection ─────────────────────────────────────────────
    // Get daily sales for last 60 days
    const [dailySales]: any = await db.query(`
      SELECT
        DATE(sale_date) AS day,
        SUM(quantity)   AS total_qty,
        SUM(total)      AS total_revenue,
        COUNT(*)        AS tx_count
      FROM sales
      WHERE sale_date >= DATE_SUB(CURDATE(), INTERVAL 60 DAY)
      GROUP BY day
      ORDER BY day ASC
    `);

    if (dailySales.length >= 7) {
      // Calculate 30-day rolling average (excluding last 7 days)
      const baseData = dailySales.slice(0, -7);
      const avgQty     = baseData.reduce((s: number, r: any) => s + Number(r.total_qty), 0) / baseData.length;
      const avgRevenue = baseData.reduce((s: number, r: any) => s + Number(r.total_revenue), 0) / baseData.length;

      // Check last 7 days for spikes/drops
      const recentData = dailySales.slice(-7);
      for (const row of recentData) {
        const qty     = Number(row.total_qty);
        const revenue = Number(row.total_revenue);
        const day     = new Date(row.day).toLocaleDateString("en-BD", {
          timeZone: "Asia/Dhaka", day: "2-digit", month: "short", year: "numeric"
        });

        // Sales spike
        if (avgQty > 0 && qty > avgQty * (1 + salesSpikePercent / 100)) {
          const pct = Math.round(((qty - avgQty) / avgQty) * 100);
          anomalies.push({
            type: "sales_spike",
            severity: pct > 100 ? "high" : pct > 70 ? "medium" : "low",
            title: "Unusual Sales Spike",
            description: `Sales on ${day} were ${pct}% above the 30-day average. This may indicate a promotional event or data entry error.`,
            value: `${qty} units sold (avg: ${Math.round(avgQty)})`,
            date: day,
          });
        }

        // Revenue drop
        if (avgRevenue > 0 && revenue < avgRevenue * (1 - revenueDropPercent / 100)) {
          const pct = Math.round(((avgRevenue - revenue) / avgRevenue) * 100);
          anomalies.push({
            type: "revenue_drop",
            severity: pct > 60 ? "high" : pct > 40 ? "medium" : "low",
            title: "Sudden Revenue Drop",
            description: `Revenue on ${day} dropped ${pct}% below the 30-day average. Possible causes: low traffic, stock-out, or missing entries.`,
            value: `৳${Number(revenue).toLocaleString("en-IN")} (avg: ৳${Math.round(avgRevenue).toLocaleString("en-IN")})`,
            date: day,
          });
        }
      }
    }

    // ─── 2. Suspicious Expense Detection ─────────────────────────────────────
    // Get monthly expense averages per category
    const [monthlyExpenses]: any = await db.query(`
      SELECT
        category,
        DATE_FORMAT(created_at, '%Y-%m') AS month,
        SUM(amount) AS total
      FROM expenses
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY category, month
      ORDER BY month ASC
    `);

    // Group by category
    const categoryMap: Record<string, number[]> = {};
    for (const row of monthlyExpenses) {
      if (!categoryMap[row.category]) categoryMap[row.category] = [];
      categoryMap[row.category].push(Number(row.total));
    }

    // For each category, check if latest month is spike
    for (const [category, amounts] of Object.entries(categoryMap)) {
      if (amounts.length < 2) continue;
      const latest  = amounts[amounts.length - 1];
      const history = amounts.slice(0, -1);
      const avg     = history.reduce((s, v) => s + v, 0) / history.length;

      if (avg > 0 && latest > avg * (1 + expenseSpikePercent / 100)) {
        const pct = Math.round(((latest - avg) / avg) * 100);
        anomalies.push({
          type: "suspicious_expense",
          severity: pct > 100 ? "high" : pct > 60 ? "medium" : "low",
          title: "Suspicious Expense Detected",
          description: `${category} expense this month is ${pct}% higher than the average of previous months. Please verify this entry.`,
          value: `৳${latest.toLocaleString("en-IN")} (avg: ৳${Math.round(avg).toLocaleString("en-IN")})`,
          date: "This month",
        });
      }
    }

    // Sort by severity
    const severityOrder = { high: 0, medium: 1, low: 2 };
    anomalies.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return NextResponse.json({ success: true, data: anomalies, total: anomalies.length });
  } catch (err) {
    console.error("Anomaly Detection Error:", err);
    return NextResponse.json({ success: false, message: "Failed to detect anomalies" }, { status: 500 });
  }
}