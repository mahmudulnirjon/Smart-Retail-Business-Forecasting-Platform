/**
 * Dashboard API — app/api/dashboard/route.ts
 *
 * DB server already Dhaka timezone-এ আছে।
 * তাই NOW() সরাসরি Dhaka local time দেয় — কোনো INTERVAL দরকার নেই।
 */

import { NextResponse } from 'next/server';
import { db }          from '../../../lib/db';
import { verifyToken } from '../../../lib/auth';
import { cookies }     from 'next/headers';

const num = (v: unknown) => Number(v ?? 0);

export async function GET() {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

  const user = await verifyToken(token);
  if (!user)  return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 });

  const isSales       = user.role === 'SALES';
  const isManagerPlus = user.role === 'ADMIN' || user.role === 'MANAGER';

  try {

    // DB server Dhaka timezone-এ — NOW() = Dhaka now, DATE(NOW()) = আজকের date
    const todayCond = `DATE(s.sale_date) = DATE(NOW())`;
    const monthCond = `YEAR(s.sale_date)  = YEAR(NOW())
                   AND MONTH(s.sale_date) = MONTH(NOW())`;
    const prevMonthCond = `YEAR(s.sale_date)  = YEAR(NOW() - INTERVAL 1 MONTH)
                       AND MONTH(s.sale_date) = MONTH(NOW() - INTERVAL 1 MONTH)`;

    // ✅ FIX: ensure userWhere is a proper SQL fragment (empty string for managers)
    const userWhere = isSales ? `AND s.user_id = ${user.id}` : '';

    // ── TODAY KPIs (works for both roles) ──────────────────────────────────
    const [todayRows]: any = await db.query(`
      SELECT
        COUNT(*)                     AS txn,
        COALESCE(SUM(s.total),    0) AS revenue,
        COALESCE(SUM(s.quantity), 0) AS units
      FROM sales s
      WHERE ${todayCond} ${userWhere}
    `);

    // ── THIS MONTH KPIs (works for both roles) ────────────────────────────
    const [monthRows]: any = await db.query(`
      SELECT
        COUNT(*)                     AS txn,
        COALESCE(SUM(s.total),    0) AS revenue,
        COALESCE(SUM(s.quantity), 0) AS units
      FROM sales s
      WHERE ${monthCond} ${userWhere}
    `);

    // ── PREVIOUS MONTH (growth %) ─────────────────────────────────────────
    const [prevRows]: any = await db.query(`
      SELECT COALESCE(SUM(s.total), 0) AS revenue
      FROM sales s
      WHERE ${prevMonthCond} ${userWhere}
    `);

    const monthRevenue  = num(monthRows[0]?.revenue);
    const prevRevenue   = num(prevRows[0]?.revenue);
    const revenueGrowth = prevRevenue > 0
      ? Number(((monthRevenue - prevRevenue) / prevRevenue * 100).toFixed(1))
      : null;

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ADMIN / MANAGER ONLY (unchanged)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    let totalExpensesMonth  = 0;
    let stockAlerts         = { low: 0, over: 0 };
    let topProducts:         any[] = [];
    let employeeLeaderboard: any[] = [];
    let recentSales:         any[] = [];
    let last6Months:         any[] = [];

    if (isManagerPlus) {

      const [expRows]: any = await db.query(`
        SELECT COALESCE(SUM(amount), 0) AS total
        FROM expenses e
        WHERE YEAR(e.created_at)  = YEAR(NOW())
          AND MONTH(e.created_at) = MONTH(NOW())
      `);
      totalExpensesMonth = num(expRows[0]?.total);

      const [alertRows]: any = await db.query(`
        SELECT
          SUM(CASE WHEN stock <= low_stock_limit  THEN 1 ELSE 0 END) AS low_count,
          SUM(CASE WHEN stock >= over_stock_limit THEN 1 ELSE 0 END) AS over_count
        FROM products
      `);
      stockAlerts = {
        low:  num(alertRows[0]?.low_count),
        over: num(alertRows[0]?.over_count),
      };

      const [topRows]: any = await db.query(`
        SELECT p.name,
          SUM(s.quantity)          AS units,
          COALESCE(SUM(s.total),0) AS revenue
        FROM sales s
        JOIN products p ON p.id = s.product_id
        WHERE ${monthCond}
        GROUP BY p.id, p.name
        ORDER BY revenue DESC LIMIT 5
      `);
      topProducts = topRows.map((r: any) => ({
        name: r.name, units: num(r.units), revenue: num(r.revenue),
      }));

      const [empRows]: any = await db.query(`
        SELECT u.name,
          COALESCE(SUM(s.total),    0) AS revenue,
          COALESCE(SUM(s.quantity), 0) AS units,
          COUNT(s.id)                  AS txn
        FROM users u
        LEFT JOIN sales s
               ON s.user_id = u.id
              AND ${monthCond}
        WHERE u.role = 'SALES'
        GROUP BY u.id, u.name
        ORDER BY revenue DESC
      `);
      employeeLeaderboard = empRows.map((r: any, i: number) => ({
        rank: i + 1, name: r.name,
        revenue: num(r.revenue), units: num(r.units), txn: num(r.txn),
      }));

      const [trendRows]: any = await db.query(`
        SELECT
          DATE_FORMAT(s.sale_date, '%Y-%m') AS month,
          COALESCE(SUM(s.total), 0)         AS revenue
        FROM sales s
        WHERE s.sale_date >= NOW() - INTERVAL 6 MONTH
        GROUP BY month
        ORDER BY month ASC
      `);
      last6Months = trendRows.map((r: any) => ({
        month: String(r.month), revenue: num(r.revenue),
      }));

      const [recRows]: any = await db.query(`
        SELECT s.id,
          p.name                                    AS product,
          s.quantity, s.total,
          u.name                                    AS employee,
          DATE_FORMAT(s.sale_date, '%d %b %H:%i')  AS time
        FROM sales s
        JOIN products p ON p.id = s.product_id
        JOIN users    u ON u.id = s.user_id
        ORDER BY s.sale_date DESC LIMIT 8
      `);
      recentSales = recRows.map((r: any) => ({
        id: r.id, product: r.product,
        quantity: num(r.quantity), total: num(r.total),
        employee: r.employee, time: r.time,
      }));
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // SALES EMPLOYEE ONLY (FIXED)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    let myRank         = null as number | null;
    let myRecentSales: any[] = [];
    let myLast7Days:   any[] = [];
    let myTopProducts: any[] = [];

    if (isSales) {

      const [rankRows]: any = await db.query(`
        SELECT u.id, COALESCE(SUM(s.total), 0) AS revenue
        FROM users u
        LEFT JOIN sales s
               ON s.user_id = u.id AND ${monthCond}
        WHERE u.role = 'SALES'
        GROUP BY u.id
        ORDER BY revenue DESC
      `);
      const myIdx = rankRows.findIndex((r: any) => num(r.id) === user.id);
      myRank = myIdx >= 0 ? myIdx + 1 : null;

      const [myRecRows]: any = await db.query(`
        SELECT s.id,
          p.name                                   AS product,
          s.quantity, s.total,
          DATE_FORMAT(s.sale_date, '%d %b %H:%i') AS time
        FROM sales s
        JOIN products p ON p.id = s.product_id
        WHERE s.user_id = ${user.id}
        ORDER BY s.sale_date DESC LIMIT 8
      `);
      myRecentSales = myRecRows.map((r: any) => ({
        id: r.id, product: r.product,
        quantity: num(r.quantity), total: num(r.total), time: r.time,
      }));

      // ✅ FIX: last 7 days for sales employee – now correctly filtered
      const [my7Rows]: any = await db.query(`
        SELECT
          DATE_FORMAT(s.sale_date, '%a %d') AS day,
          DATE(s.sale_date)                 AS dt,
          COALESCE(SUM(s.total),    0)      AS revenue,
          COALESCE(SUM(s.quantity), 0)      AS units
        FROM sales s
        WHERE s.user_id = ${user.id}
          AND DATE(s.sale_date) >= DATE(NOW()) - INTERVAL 7 DAY
        GROUP BY dt, day
        ORDER BY dt ASC
      `);
      myLast7Days = my7Rows.map((r: any) => ({
        day: r.day, revenue: num(r.revenue), units: num(r.units),
      }));

      const [myProdRows]: any = await db.query(`
        SELECT p.name,
          SUM(s.quantity)          AS units,
          COALESCE(SUM(s.total),0) AS revenue
        FROM sales s
        JOIN products p ON p.id = s.product_id
        WHERE s.user_id = ${user.id} AND ${monthCond}
        GROUP BY p.id, p.name
        ORDER BY revenue DESC LIMIT 5
      `);
      myTopProducts = myProdRows.map((r: any) => ({
        name: r.name, units: num(r.units), revenue: num(r.revenue),
      }));
    }

    // ── Response ──────────────────────────────────────────────────────────────
    return NextResponse.json({
      success: true,
      data: {
        user: { id: user.id, name: user.name, role: user.role },
        today: {
          txn:     num(todayRows[0]?.txn),
          revenue: num(todayRows[0]?.revenue),
          units:   num(todayRows[0]?.units),
        },
        month: {
          txn:          num(monthRows[0]?.txn),
          revenue:      monthRevenue,
          units:        num(monthRows[0]?.units),
          expenses:     totalExpensesMonth,
          profit:       monthRevenue - totalExpensesMonth,
          revenueGrowth,
        },
        stockAlerts,
        topProducts,
        employeeLeaderboard,
        recentSales,
        last6Months,
        myRank,
        myRecentSales,
        myLast7Days,
        myTopProducts,
      },
    });

  } catch (err) {
    console.error('Dashboard API Error:', err);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}