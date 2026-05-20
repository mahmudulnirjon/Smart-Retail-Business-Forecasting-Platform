import { NextResponse } from "next/server";
import { db }          from "../../../lib/db";
import { verifyToken } from "../../../lib/auth";
import { cookies }     from "next/headers";

// GET → fetch sales (Admin/Manager = all, Sales Employee = own only)
export async function GET() {
  try {
    // ── Auth check ─────────────────────────────────────────────────────────
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    const user  = token ? await verifyToken(token) : null;

    // Build WHERE clause based on role
    const whereClause =
      user && user.role === "SALES"
        ? `WHERE s.user_id = ${Number(user.id)}`  // employee → own only
        : "";                                       // admin/manager → all

    const [rows]: any = await db.query(`
      SELECT
        s.id,
        s.product_id,
        p.name                                         AS product_name,
        s.quantity,
        s.total,
        s.user_id,
        u.name                                         AS user_name,
        DATE_FORMAT(s.sale_date, '%Y-%m-%d %H:%i:%s') AS sale_date
      FROM sales s
      JOIN products p ON s.product_id = p.id
      JOIN users    u ON s.user_id    = u.id
      ${whereClause}
      ORDER BY s.sale_date DESC
    `);

    return NextResponse.json({ success: true, data: rows });
  } catch (err) {
    console.error("Sales API GET Error:", err);
    return NextResponse.json({ success: false, message: "Failed to fetch sales" }, { status: 500 });
  }
}

// POST → add sale, calculate total, reduce stock
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { product_id, quantity, user_id } = body;

    if (!product_id || !quantity || !user_id) {
      return NextResponse.json({
        success: false,
        message: "Product, quantity, and user ID are required",
      }, { status: 400 });
    }

    const [productRows]: any = await db.query(
      `SELECT id, price, stock FROM products WHERE id = ? LIMIT 1`,
      [product_id]
    );

    if (!productRows || productRows.length === 0) {
      return NextResponse.json({ success: false, message: "Product not found" }, { status: 404 });
    }

    const product    = productRows[0];
    const unitPrice  = Number(product.price);
    const qty        = Number(quantity);
    const totalPrice = unitPrice * qty;

    if (product.stock < qty) {
      return NextResponse.json({
        success: false,
        message: `Insufficient stock. Available: ${product.stock}`,
      }, { status: 400 });
    }

    await db.query(
      `INSERT INTO sales (product_id, quantity, total, user_id, sale_date) VALUES (?, ?, ?, ?, NOW())`,
      [product_id, qty, totalPrice, user_id]
    );

    await db.query(
      `UPDATE products SET stock = stock - ?, updated_at = NOW() WHERE id = ?`,
      [qty, product_id]
    );

    return NextResponse.json({ success: true, message: "Sale added successfully", total: totalPrice });
  } catch (err) {
    console.error("Sales API POST Error:", err);
    return NextResponse.json({ success: false, message: "Failed to add sale" }, { status: 500 });
  }
}

// DELETE → remove a sale by id and restore product stock
export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: "Sale ID is required" }, { status: 400 });
    }

    const [saleRows]: any = await db.query(
      `SELECT product_id, quantity FROM sales WHERE id = ? LIMIT 1`,
      [id]
    );

    if (!saleRows || saleRows.length === 0) {
      return NextResponse.json({ success: false, message: "Sale not found" }, { status: 404 });
    }

    const { product_id, quantity } = saleRows[0];

    await db.query(`DELETE FROM sales WHERE id = ?`, [id]);
    await db.query(
      `UPDATE products SET stock = stock + ?, updated_at = NOW() WHERE id = ?`,
      [quantity, product_id]
    );

    return NextResponse.json({ success: true, message: "Sale deleted successfully and stock restored" });
  } catch (err) {
    console.error("Sales API DELETE Error:", err);
    return NextResponse.json({ success: false, message: "Failed to delete sale" }, { status: 500 });
  }
}