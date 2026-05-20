/**
 * Reports API Route — app/api/reports/route.ts
 * ─────────────────────────────────────────────
 * আপনার existing pattern রেখে পুরো upgrade:
 *   • db  → lib/db  (same mysql2 pool)
 *   • auth → JWT cookie via verifyToken (same lib/auth)
 *   • response → { success, data } (same format)
 *
 * Query params:
 *   from     — "YYYY-MM-DD"
 *   to       — "YYYY-MM-DD"
 *   grain    — "daily" | "weekly" | "monthly" | "quarterly" | "yearly"
 *   product  — product id (optional, "" = all)
 *   employee — user id    (optional, "" = all)
 *
 * Role-based:
 *   ADMIN + MANAGER → সব data দেখবে
 *   SALES           → শুধু নিজের sales (expense hidden)
 */

import { NextRequest, NextResponse } from 'next/server';
import { db }          from '../../../lib/db';
import { verifyToken } from '../../../lib/auth';
import { cookies }     from 'next/headers';

const TZ = '+06:00'; // Dhaka UTC+6

type Grain = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

// ── Date truncation per grain ──────────────────────────────────────────────────
function dateTrunc(col: string, grain: Grain): string {
  const L = `CONVERT_TZ(${col}, '+00:00', '${TZ}')`;
  switch (grain) {
    case 'daily':     return `DATE(${L})`;
    case 'weekly':    return `DATE(${L} - INTERVAL (WEEKDAY(${L})) DAY)`;
    case 'monthly':   return `DATE_FORMAT(${L}, '%Y-%m-01')`;
    case 'quarterly': return `MAKEDATE(YEAR(${L}), 1) + INTERVAL (QUARTER(${L})-1)*3 MONTH`;
    case 'yearly':    return `DATE_FORMAT(${L}, '%Y-01-01')`;
  }
}

// ── Safe number ────────────────────────────────────────────────────────────────
const num = (v: unknown): number => Number(v ?? 0);

// ═════════════════════════════════════════════════════════════════════════════
export async function GET(request: NextRequest) {

  // ── JWT auth (existing verifyToken pattern) ───────────────────────────────
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }
  const user = await verifyToken(token);
  if (!user) {
    return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 });
  }

  const isSales       = user.role === 'SALES';
  const isManagerPlus = user.role === 'ADMIN' || user.role === 'MANAGER';

  // ── Query params ──────────────────────────────────────────────────────────
  const sp       = request.nextUrl.searchParams;
  const from     = sp.get('from')     || '2024-09-01';
  const to       = sp.get('to')       || '2025-04-30';
  const grain    = (sp.get('grain')   || 'monthly') as Grain;
  const product  = sp.get('product')  || '';   // product id filter
  const employee = sp.get('employee') || '';   // user id filter

  // Build WHERE clauses
  let saleWhere = `DATE(CONVERT_TZ(s.sale_date,'+00:00','${TZ}')) BETWEEN '${from}' AND '${to}'`;
  if (isSales)           saleWhere += ` AND s.user_id = ${user.id}`;
  else if (employee)     saleWhere += ` AND s.user_id = ${parseInt(employee)}`;
  if (product)           saleWhere += ` AND s.product_id = ${parseInt(product)}`;

  const expWhere = `DATE(CONVERT_TZ(e.created_at,'+00:00','${TZ}')) BETWEEN '${from}' AND '${to}'`;

  try {

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 1. SUMMARY CARDS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const [sumRows]: any = await db.query(`
      SELECT
        COUNT(*)                    AS totalTransactions,
        COALESCE(SUM(s.quantity),0) AS totalUnitsSold,
        COALESCE(SUM(s.total),   0) AS totalRevenue,
        -- backward compat
        COUNT(id) AS totalSalesCount,
        SUM(total) * 0.15 AS profitMargin
      FROM sales s
      WHERE ${saleWhere}
    `);

    let totalExpenses = 0;
    if (isManagerPlus) {
      const [expSum]: any = await db.query(`
        SELECT COALESCE(SUM(amount),0) AS total FROM expenses e WHERE ${expWhere}
      `);
      totalExpenses = num(expSum[0]?.total);
    }

    const totalRevenue    = num(sumRows[0]?.totalRevenue);
    const netProfit       = totalRevenue - totalExpenses;
    const profitMarginPct = totalRevenue > 0
      ? Number((netProfit / totalRevenue * 100).toFixed(1)) : 0;

    const summary = {
      // new fields
      totalRevenue,
      totalExpenses,
      netProfit,
      profitMarginPct,
      totalUnitsSold:    num(sumRows[0]?.totalUnitsSold),
      totalTransactions: num(sumRows[0]?.totalTransactions),
      // backward compat
      totalSalesCount: num(sumRows[0]?.totalSalesCount),
      profitMargin:    num(sumRows[0]?.profitMargin),
    };

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 2. REVENUE & EXPENSE TABLE  (per period)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const trunc = dateTrunc('s.sale_date', grain);
    const [revRows]: any = await db.query(`
      SELECT
        ${trunc}                     AS period,
        COALESCE(SUM(s.total),   0) AS revenue,
        COALESCE(SUM(s.quantity),0) AS units,
        COUNT(*)                    AS txn
      FROM sales s
      WHERE ${saleWhere}
      GROUP BY period
      ORDER BY period ASC
    `);

    // Expense per same period (Admin/Manager only)
    let expByPeriod: Record<string, number> = {};
    if (isManagerPlus) {
      const eTrunc = dateTrunc('e.created_at', grain);
      const [eRows]: any = await db.query(`
        SELECT ${eTrunc} AS period, COALESCE(SUM(amount),0) AS amount
        FROM expenses e WHERE ${expWhere}
        GROUP BY period
      `);
      eRows.forEach((r: any) => { expByPeriod[String(r.period)] = num(r.amount); });
    }

    const revenueExpenseTable = revRows.map((r: any) => {
      const rev = num(r.revenue);
      const exp = expByPeriod[String(r.period)] ?? 0;
      const pft = rev - exp;
      return {
        period:    String(r.period),
        revenue:   rev,
        expense:   exp,
        profit:    pft,
        margin:    rev > 0 ? Number((pft / rev * 100).toFixed(1)) : 0,
        units:     num(r.units),
        txn:       num(r.txn),
      };
    });

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 3. TOP PRODUCTS TABLE
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const [prodRows]: any = await db.query(`
      SELECT
        p.id,
        p.name,
        COALESCE(SUM(s.quantity),0) AS unitsSold,
        COALESCE(SUM(s.total),   0) AS revenue,
        COUNT(s.id)                 AS txn,
        -- totalSold backward compat
        COALESCE(SUM(s.quantity),0) AS totalSold
      FROM products p
      LEFT JOIN sales s
             ON p.id = s.product_id
            AND DATE(CONVERT_TZ(s.sale_date,'+00:00','${TZ}')) BETWEEN '${from}' AND '${to}'
            ${isSales ? `AND s.user_id = ${user.id}` : (employee ? `AND s.user_id = ${parseInt(employee)}` : '')}
      GROUP BY p.id, p.name
      ORDER BY revenue DESC
      LIMIT 10
    `);

    const topProducts = prodRows.map((r: any) => ({
      id:       num(r.id),
      name:     String(r.name),
      unitsSold: num(r.unitsSold),
      revenue:  num(r.revenue),
      // profit estimated at 15% margin (no cost data in schema)
      profit:   Number((num(r.revenue) * 0.15).toFixed(2)),
      txn:      num(r.txn),
      // backward compat
      totalSold: num(r.totalSold),
    }));

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 4. EMPLOYEE PERFORMANCE TABLE  (Admin/Manager only)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    let employeeTable: any[] = [];
    if (isManagerPlus) {
      const [empRows]: any = await db.query(`
        SELECT
          u.id,
          u.name,
          COALESCE(SUM(s.total),   0) AS revenue,
          COALESCE(SUM(s.quantity),0) AS units,
          COUNT(s.id)                 AS totalSales
        FROM users u
        LEFT JOIN sales s
               ON s.user_id = u.id
              AND DATE(CONVERT_TZ(s.sale_date,'+00:00','${TZ}')) BETWEEN '${from}' AND '${to}'
              ${product ? `AND s.product_id = ${parseInt(product)}` : ''}
        WHERE u.role = 'SALES'
        GROUP BY u.id, u.name
        ORDER BY revenue DESC
      `);
      employeeTable = empRows.map((r: any) => ({
        id:         num(r.id),
        name:       String(r.name),
        totalSales: num(r.totalSales),
        revenue:    num(r.revenue),
        units:      num(r.units),
        avgPerSale: num(r.totalSales) > 0
          ? Math.round(num(r.revenue) / num(r.totalSales)) : 0,
      }));
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 5. FILTER OPTIONS  (dropdown lists for UI)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const [allProducts]: any = await db.query(
      `SELECT id, name FROM products ORDER BY name ASC`
    );
    const [allEmployees]: any = isManagerPlus
      ? await db.query(`SELECT id, name FROM users WHERE role='SALES' ORDER BY name ASC`)
      : [[]];

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Response — { success, data } (আপনার existing format)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    return NextResponse.json({
      success: true,
      data: {
        role: user.role,
        meta: { from, to, grain, product, employee },
        summary,
        revenueExpenseTable,
        topProducts,
        employeeTable,
        filterOptions: {
          products:  allProducts.map((p: any) => ({ id: num(p.id), name: String(p.name) })),
          employees: allEmployees.map((e: any) => ({ id: num(e.id), name: String(e.name) })),
        },
      },
    });

  } catch (error) {
    console.error('Reports API Error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch reports data' },
      { status: 500 }
    );
  }
}