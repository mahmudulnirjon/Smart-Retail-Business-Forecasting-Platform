// app/api/analytics/route.ts
// Advanced Analytics API — Smart Retail BI Platform
// Now supports date range filtering: today, week, month, year, all
// Timezone: Asia/Dhaka (UTC+6)

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '../../../lib/auth';
import { db } from '../../../lib/db';

// ─── Helpers ────────────────────────────────────────────────────────────────

const dhakaDate = (col: string) => `CONVERT_TZ(${col}, '+00:00', '+06:00')`;

// Build WHERE clause for date range (based on Dhaka date)
function getDateRangeFilter(range: string): string {
  const now = new Date();
  // Convert current time to Dhaka time (UTC+6) for correct day boundaries
  const dhakaNow = new Date(now.getTime() + 6 * 60 * 60 * 1000);
  const todayStr = dhakaNow.toISOString().slice(0, 10);

  switch (range) {
    case 'today':
      return `DATE(${dhakaDate('sale_date')}) = '${todayStr}'`;
    case 'week':
      // last 7 days including today
      const weekAgo = new Date(dhakaNow.getTime() - 6 * 24 * 60 * 60 * 1000);
      const weekStart = weekAgo.toISOString().slice(0, 10);
      return `DATE(${dhakaDate('sale_date')}) BETWEEN '${weekStart}' AND '${todayStr}'`;
    case 'month':
      const monthAgo = new Date(dhakaNow.getTime() - 29 * 24 * 60 * 60 * 1000);
      const monthStart = monthAgo.toISOString().slice(0, 10);
      return `DATE(${dhakaDate('sale_date')}) BETWEEN '${monthStart}' AND '${todayStr}'`;
    case 'year':
      const yearAgo = new Date(dhakaNow.getTime() - 364 * 24 * 60 * 60 * 1000);
      const yearStart = yearAgo.toISOString().slice(0, 10);
      return `DATE(${dhakaDate('sale_date')}) BETWEEN '${yearStart}' AND '${todayStr}'`;
    default: // 'all'
      return '1=1';
  }
}

function getExpenseDateRangeFilter(range: string): string {
  const now = new Date();
  const dhakaNow = new Date(now.getTime() + 6 * 60 * 60 * 1000);
  const todayStr = dhakaNow.toISOString().slice(0, 10);

  switch (range) {
    case 'today':
      return `DATE(${dhakaDate('created_at')}) = '${todayStr}'`;
    case 'week':
      const weekAgo = new Date(dhakaNow.getTime() - 6 * 24 * 60 * 60 * 1000);
      const weekStart = weekAgo.toISOString().slice(0, 10);
      return `DATE(${dhakaDate('created_at')}) BETWEEN '${weekStart}' AND '${todayStr}'`;
    case 'month':
      const monthAgo = new Date(dhakaNow.getTime() - 29 * 24 * 60 * 60 * 1000);
      const monthStart = monthAgo.toISOString().slice(0, 10);
      return `DATE(${dhakaDate('created_at')}) BETWEEN '${monthStart}' AND '${todayStr}'`;
    case 'year':
      const yearAgo = new Date(dhakaNow.getTime() - 364 * 24 * 60 * 60 * 1000);
      const yearStart = yearAgo.toISOString().slice(0, 10);
      return `DATE(${dhakaDate('created_at')}) BETWEEN '${yearStart}' AND '${todayStr}'`;
    default:
      return '1=1';
  }
}

// ─── GET /api/analytics ──────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const user = await verifyToken(token);
  if (!user || !['ADMIN', 'MANAGER'].includes(user.role)) {
    return NextResponse.json({ success: false, message: 'Access denied' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const period = (searchParams.get('period') || 'monthly') as 'daily' | 'weekly' | 'monthly';
  const range = (searchParams.get('range') || 'all') as 'today' | 'week' | 'month' | 'year' | 'all';

  const labelExpr: Record<typeof period, string> = {
    daily:   `DATE_FORMAT(${dhakaDate('s.sale_date')}, '%d %b %Y')`,
    weekly:  `CONCAT('Wk ', WEEK(${dhakaDate('s.sale_date')}, 6), ' ', YEAR(${dhakaDate('s.sale_date')}))`,
    monthly: `DATE_FORMAT(${dhakaDate('s.sale_date')}, '%b %Y')`,
  };

  const expLabelExpr: Record<typeof period, string> = {
    daily:   `DATE_FORMAT(${dhakaDate('e.created_at')}, '%d %b %Y')`,
    weekly:  `CONCAT('Wk ', WEEK(${dhakaDate('e.created_at')}, 6), ' ', YEAR(${dhakaDate('e.created_at')}))`,
    monthly: `DATE_FORMAT(${dhakaDate('e.created_at')}, '%b %Y')`,
  };

  const limitMap: Record<typeof period, number> = { daily: 30, weekly: 16, monthly: 12 };
  const rowLimit = limitMap[period];

  // Date filters
  const salesFilter = getDateRangeFilter(range);
  const expenseFilter = getExpenseDateRangeFilter(range);

  try {
    // ── 1. Summary KPIs (filtered by range) ────────────────────────────────
    const [kpiRows]: any = await db.query(`
      SELECT
        COUNT(s.id)                                         AS totalSalesCount,
        COALESCE(SUM(s.quantity), 0)                        AS totalUnitsSold,
        COALESCE(SUM(s.total), 0)                           AS totalRevenue,
        (SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE ${expenseFilter}) AS totalExpenses,
        COALESCE(SUM(s.total), 0)
          - (SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE ${expenseFilter}) AS netProfit
      FROM sales s
      WHERE ${salesFilter}
    `);

    const kpi = {
      totalSalesCount: Number(kpiRows[0]?.totalSalesCount || 0),
      totalUnitsSold:  Number(kpiRows[0]?.totalUnitsSold  || 0),
      totalRevenue:    Number(kpiRows[0]?.totalRevenue    || 0),
      totalExpenses:   Number(kpiRows[0]?.totalExpenses   || 0),
      netProfit:       Number(kpiRows[0]?.netProfit       || 0),
      profitMargin:    kpiRows[0]?.totalRevenue > 0
        ? ((Number(kpiRows[0]?.netProfit) / Number(kpiRows[0]?.totalRevenue)) * 100).toFixed(2)
        : '0.00',
    };

    // ── 2. Revenue trend (filtered + grouped) ──────────────────────────────
    const [revRows]: any = await db.query(`
      SELECT
        ${labelExpr[period]}        AS label,
        COALESCE(SUM(total), 0)     AS revenue,
        COALESCE(SUM(quantity), 0)  AS units
      FROM sales s
      WHERE ${salesFilter}
      GROUP BY label
      ORDER BY MIN(${dhakaDate('s.sale_date')}) DESC
      LIMIT ${rowLimit}
    `);
    const revenueTrend = revRows.reverse().map((r: any) => ({
      label:   r.label,
      revenue: Number(r.revenue),
      units:   Number(r.units),
    }));

    // ── 3. Expense trend (filtered + grouped) ───────────────────────────────
    const [expRows]: any = await db.query(`
      SELECT
        ${expLabelExpr[period]}       AS label,
        COALESCE(SUM(amount), 0)      AS expenses,
        category
      FROM expenses e
      WHERE ${expenseFilter}
      GROUP BY label, category
      ORDER BY MIN(${dhakaDate('e.created_at')}) DESC
      LIMIT ${rowLimit * 7}
    `);

    const expMap: Record<string, number> = {};
    expRows.forEach((r: any) => {
      expMap[r.label] = (expMap[r.label] || 0) + Number(r.expenses);
    });
    const expenseTrend = Object.entries(expMap)
      .slice(-rowLimit)
      .map(([label, expenses]) => ({ label, expenses }));

    // ── 4. Expense by category (filtered) ──────────────────────────────────
    const [catRows]: any = await db.query(`
      SELECT
        category,
        COALESCE(SUM(amount), 0) AS total
      FROM expenses
      WHERE ${expenseFilter}
      GROUP BY category
      ORDER BY total DESC
    `);
    const expenseByCategory = catRows.map((r: any) => ({
      category: r.category,
      total:    Number(r.total),
    }));

    // ── 5. Profit margin trend (based on filtered revenue & expense trends) ─
    const profitTrend = revenueTrend.map((rv: any) => {
      const exp = expenseTrend.find((e: any) => e.label === rv.label);
      const expenses = exp ? exp.expenses : 0;
      const profit = rv.revenue - expenses;
      return {
        label:   rv.label,
        revenue: rv.revenue,
        expenses,
        profit,
        margin:  rv.revenue > 0 ? ((profit / rv.revenue) * 100).toFixed(1) : '0.0',
      };
    });

    // ── 6. Top products (filtered) ─────────────────────────────────────────
    const [prodRows]: any = await db.query(`
      SELECT
        p.id,
        p.name,
        COALESCE(SUM(s.quantity), 0)                          AS totalSold,
        COALESCE(SUM(s.total), 0)                             AS revenue,
        COALESCE(AVG(p.price), 0)                             AS avgPrice,
        COALESCE(SUM(s.total) / NULLIF(SUM(s.quantity), 0), 0) AS avgSalePrice
      FROM products p
      LEFT JOIN sales s ON p.id = s.product_id AND ${salesFilter}
      GROUP BY p.id, p.name
      ORDER BY revenue DESC
      LIMIT 10
    `);
    const topProducts = prodRows.map((r: any) => ({
      id:           Number(r.id),
      name:         r.name,
      totalSold:    Number(r.totalSold),
      revenue:      Number(r.revenue),
      avgPrice:     Number(r.avgPrice),
      avgSalePrice: Number(r.avgSalePrice),
    }));

    // ── 7. Employee performance (filtered) ─────────────────────────────────
    const [empRows]: any = await db.query(`
      SELECT
        u.id,
        u.name,
        u.role,
        COUNT(s.id)                  AS salesCount,
        COALESCE(SUM(s.quantity), 0) AS unitsSold,
        COALESCE(SUM(s.total), 0)    AS revenue
      FROM users u
      LEFT JOIN sales s ON u.id = s.user_id AND ${salesFilter}
      WHERE u.role IN ('SALES', 'MANAGER')
      GROUP BY u.id, u.name, u.role
      ORDER BY revenue DESC
    `);
    const employeePerformance = empRows.map((r: any) => ({
      id:         Number(r.id),
      name:       r.name,
      role:       r.role,
      salesCount: Number(r.salesCount),
      unitsSold:  Number(r.unitsSold),
      revenue:    Number(r.revenue),
    }));

    // ── 8. Revenue heatmap (filtered) ──────────────────────────────────────
    const [heatRows]: any = await db.query(`
      SELECT
        DAYOFWEEK(${dhakaDate('sale_date')}) - 1  AS dayOfWeek,
        HOUR(${dhakaDate('sale_date')})            AS hourOfDay,
        COALESCE(SUM(total), 0)                    AS revenue,
        COUNT(id)                                  AS txCount
      FROM sales
      WHERE ${salesFilter}
      GROUP BY dayOfWeek, hourOfDay
    `);

    const bdDayMap: Record<number, number> = { 6: 0, 0: 1, 1: 2, 2: 3, 3: 4, 4: 5, 5: 6 };
    const heatGrid: { day: number; hour: number; revenue: number; txCount: number }[] = [];
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        heatGrid.push({ day: d, hour: h, revenue: 0, txCount: 0 });
      }
    }
    heatRows.forEach((r: any) => {
      const bdDay = bdDayMap[Number(r.dayOfWeek)] ?? 0;
      const idx = bdDay * 24 + Number(r.hourOfDay);
      if (heatGrid[idx]) {
        heatGrid[idx].revenue  = Number(r.revenue);
        heatGrid[idx].txCount  = Number(r.txCount);
      }
    });

    // ── 9. Daily comparison: today vs yesterday (real time, independent of range) ──
    //    (only used when range = 'today' on frontend)
    const [todayRow]: any = await db.query(`
      SELECT
        COALESCE(SUM(total), 0)    AS revenue,
        COALESCE(SUM(quantity), 0) AS units,
        COUNT(id)                  AS txCount
      FROM sales
      WHERE DATE(${dhakaDate('sale_date')}) = CURDATE()
    `);
    const [yesterdayRow]: any = await db.query(`
      SELECT
        COALESCE(SUM(total), 0)    AS revenue,
        COALESCE(SUM(quantity), 0) AS units,
        COUNT(id)                  AS txCount
      FROM sales
      WHERE DATE(${dhakaDate('sale_date')}) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)
    `);

    const todayStats = {
      revenue:  Number(todayRow[0]?.revenue  || 0),
      units:    Number(todayRow[0]?.units    || 0),
      txCount:  Number(todayRow[0]?.txCount  || 0),
    };
    const yesterdayStats = {
      revenue:  Number(yesterdayRow[0]?.revenue  || 0),
      units:    Number(yesterdayRow[0]?.units    || 0),
      txCount:  Number(yesterdayRow[0]?.txCount  || 0),
    };

    // ─── Response ──────────────────────────────────────────────────────────
    return NextResponse.json({
      success: true,
      period,
      range,
      data: {
        kpi,
        revenueTrend,
        expenseTrend,
        expenseByCategory,
        profitTrend,
        topProducts,
        employeePerformance,
        heatGrid,
        todayStats,
        yesterdayStats,
      },
    });
  } catch (error) {
    console.error('Analytics API Error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}