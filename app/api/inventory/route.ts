import { NextResponse } from "next/server";
import { db } from "../../../lib/db";

// GET → fetch all products with alertType
export async function GET() {
  try {
    const [rows]: any = await db.query(`
      SELECT id, name, price, stock, low_stock_limit, over_stock_limit, created_at, updated_at
      FROM products
      ORDER BY name
    `);

    // Remove duplicates by id & compute alertType
    const productMap: Record<number, any> = {};
    rows.forEach((p: any) => {
      if (!productMap[p.id]) productMap[p.id] = { ...p };
      else productMap[p.id].stock += p.stock; // aggregate stock
    });

    const dataWithAlert = Object.values(productMap).map(p => {
      let alertType = "Normal";
      if (p.stock <= p.low_stock_limit) alertType = "Low Stock";
      else if (p.stock > p.over_stock_limit) alertType = "Overstock";
      return { ...p, alertType };
    });

    return NextResponse.json({ success: true, data: dataWithAlert });
  } catch (err) {
    console.error("Inventory API GET Error:", err);
    return NextResponse.json({ success: false, message: "Failed to fetch inventory" }, { status: 500 });
  }
}

// PATCH → update Low/Over stock limit
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { product_id, low_stock_limit, over_stock_limit } = body;

    if (!product_id || low_stock_limit == null || over_stock_limit == null) {
      return NextResponse.json({ success: false, message: "All fields required" }, { status: 400 });
    }

    await db.query(
      `UPDATE products SET low_stock_limit = ?, over_stock_limit = ?, updated_at = NOW() WHERE id = ?`,
      [low_stock_limit, over_stock_limit, product_id]
    );

    return NextResponse.json({ success: true, message: "Limits updated successfully" });
  } catch (err) {
    console.error("Inventory API PATCH Error:", err);
    return NextResponse.json({ success: false, message: "Failed to update limits" }, { status: 500 });
  }
}