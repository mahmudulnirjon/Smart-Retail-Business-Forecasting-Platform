import { NextResponse } from "next/server";
import { db } from "../../../lib/db";

// GET → fetch all expenses with optional date filter
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter') || 'all'; // today, week, month, year, all

    let dateCondition = '';
    const now = new Date();
    let startDate: Date | null = null;

    switch (filter) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate = new Date(now);
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'all':
      default:
        // no date filter
        break;
    }

    let query = `SELECT * FROM expenses ORDER BY created_at DESC`;
    const params: any[] = [];

    if (startDate) {
      query = `SELECT * FROM expenses WHERE created_at >= ? ORDER BY created_at DESC`;
      params.push(startDate);
    }

    const [rows]: any = await db.query(query, params);
    return NextResponse.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Failed to fetch expenses" }, { status: 500 });
  }
}

// POST → add new expense (unchanged)
export async function POST(req: Request) {
  try {
    const { category, amount, note } = await req.json();

    if (!category || !amount) {
      return NextResponse.json({ success: false, message: "Category and amount required" }, { status: 400 });
    }

    await db.query(
      `INSERT INTO expenses (category, amount, note, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())`,
      [category, amount, note || null]
    );

    return NextResponse.json({ success: true, message: "Expense added successfully" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Failed to add expense" }, { status: 500 });
  }
}

// PATCH → update expense (unchanged)
export async function PATCH(req: Request) {
  try {
    const { id, category, amount, note } = await req.json();
    if (!id) return NextResponse.json({ success: false, message: "Expense ID required" }, { status: 400 });

    await db.query(
      `UPDATE expenses SET category = ?, amount = ?, note = ?, updated_at = NOW() WHERE id = ?`,
      [category, amount, note || null, id]
    );
    return NextResponse.json({ success: true, message: "Expense updated successfully" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Failed to update expense" }, { status: 500 });
  }
}

// DELETE → remove expense (unchanged)
export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ success: false, message: "Expense ID required" }, { status: 400 });

    await db.query(`DELETE FROM expenses WHERE id = ?`, [id]);
    return NextResponse.json({ success: true, message: "Expense deleted successfully" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Failed to delete expense" }, { status: 500 });
  }
}