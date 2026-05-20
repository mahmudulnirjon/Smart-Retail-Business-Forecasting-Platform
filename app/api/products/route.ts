import { NextResponse } from "next/server";
import { db } from "../../../lib/db";

// ── GET — fetch all products ─────────────────────────────────────────────────
export async function GET() {
  try {
    const [rows]: any = await db.query(`
      SELECT id, name, price, stock, low_stock_limit, over_stock_limit, created_at, updated_at
      FROM products
      ORDER BY id DESC
    `);
    return NextResponse.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Failed to fetch products" }, { status: 500 });
  }
}

// ── POST — add new product OR update stock/price ─────────────────────────────
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, name, price, stock, stockAction } = body;
    // stockAction: 'add' (default) | 'minus'  — only used when updating existing product

    if (id) {
      // ── Update existing product ──────────────────────────────────────────
      if (stock == null) {
        return NextResponse.json({ success: false, message: "Stock is required for update" }, { status: 400 });
      }

      const [existing]: any = await db.query(`SELECT * FROM products WHERE id = ?`, [id]);
      if (!existing || existing.length === 0) {
        return NextResponse.json({ success: false, message: "Product not found" }, { status: 404 });
      }

      const currentStock = Number(existing[0]?.stock ?? 0);
      const changeAmount = Number(stock);

      // Stock minus — prevent going below 0
      if (stockAction === 'minus') {
        if (changeAmount > currentStock) {
          return NextResponse.json({
            success: false,
            message: `Cannot remove ${changeAmount} units. Only ${currentStock} in stock.`,
          }, { status: 400 });
        }
        const newPrice = price != null ? price : existing[0].price;
        await db.query(
          `UPDATE products SET stock = stock - ?, price = ?, updated_at = NOW() WHERE id = ?`,
          [changeAmount, newPrice, id]
        );
        return NextResponse.json({ success: true, message: "Stock reduced successfully" });
      }

      // Default: stock add
      const newPrice = price != null ? price : existing[0].price;
      await db.query(
        `UPDATE products SET stock = stock + ?, price = ?, updated_at = NOW() WHERE id = ?`,
        [changeAmount, newPrice, id]
      );
      return NextResponse.json({ success: true, message: "Product updated successfully" });

    } else {
      // ── Add new product ──────────────────────────────────────────────────
      if (!name || price == null || stock == null) {
        return NextResponse.json(
          { success: false, message: "Product name, price and stock required" },
          { status: 400 }
        );
      }
      await db.query(
        `INSERT INTO products (name, price, stock, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())`,
        [name, price, stock]
      );
      return NextResponse.json({ success: true, message: "New product added successfully" });
    }
  } catch (err) {
    console.error("Products API POST Error:", err);
    return NextResponse.json({ success: false, message: "Failed to add/update product" }, { status: 500 });
  }
}

// ── DELETE — permanently delete a product ────────────────────────────────────
export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ success: false, message: "Product ID required" }, { status: 400 });
    }

    // Check product exists
    const [existing]: any = await db.query(`SELECT id FROM products WHERE id = ?`, [id]);
    if (!existing || existing.length === 0) {
      return NextResponse.json({ success: false, message: "Product not found" }, { status: 404 });
    }

    // Delete related sales first (foreign key safety)
    await db.query(`DELETE FROM sales WHERE product_id = ?`, [id]);
    await db.query(`DELETE FROM products WHERE id = ?`, [id]);

    return NextResponse.json({ success: true, message: "Product deleted successfully" });
  } catch (err) {
    console.error("Products API DELETE Error:", err);
    return NextResponse.json({ success: false, message: "Failed to delete product" }, { status: 500 });
  }
}