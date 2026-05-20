import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
import Groq from "groq-sdk";

// Initialize Groq client (baseUrl is automatic, do not pass it)
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function GET() {
  try {
    // 1️⃣ Aggregate daily sales data (last 8 months)
    const [dailySales]: any = await db.query(`
      SELECT
        DATE(sale_date) AS day,
        p.name AS product_name,
        SUM(s.quantity) AS total_qty,
        SUM(s.quantity * p.price) AS total_revenue
      FROM sales s
      JOIN products p ON s.product_id = p.id
      WHERE s.sale_date >= DATE_SUB(NOW(), INTERVAL 8 MONTH)
      GROUP BY day, product_name
      ORDER BY day ASC
    `);

    // 2️⃣ Aggregate monthly revenue data (last 8 months)
    const [monthlyRevenue]: any = await db.query(`
      SELECT
        DATE_FORMAT(sale_date, '%Y-%m') AS month,
        SUM(s.quantity * p.price) AS revenue
      FROM sales s
      JOIN products p ON s.product_id = p.id
      WHERE s.sale_date >= DATE_SUB(NOW(), INTERVAL 8 MONTH)
      GROUP BY month
      ORDER BY month ASC
    `);

    // 3️⃣ Aggregate monthly expenses (last 8 months)
    const [monthlyExpenses]: any = await db.query(`
      SELECT
        DATE_FORMAT(created_at, '%Y-%m') AS month,
        SUM(amount) AS expense
      FROM expenses
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 8 MONTH)
      GROUP BY month
      ORDER BY month ASC
    `);

    // 4️⃣ Build summarized prompt for Groq (aggregated, not raw rows)
    const systemPrompt = `
You are a professional retail business analyst AI.
Analyze historical sales and expense data and provide forecasts.
Consider patterns like: weekends have higher sales, seasonal spikes, month-end trends.
Always respond with valid JSON only — no markdown, no explanation, no code blocks.
Use Dhaka timezone (UTC+6) for all dates. Format all currency as BDT (e.g. ৳1,20,000).
    `.trim();

    const userPrompt = `
Here is the summarized historical data for a computer gadgets retail business:

Monthly Revenue (last 8 months):
${JSON.stringify(monthlyRevenue, null, 2)}

Monthly Expenses (last 8 months):
${JSON.stringify(monthlyExpenses, null, 2)}

Daily Sales Summary (last 8 months, top entries):
${JSON.stringify(dailySales.slice(0, 60), null, 2)}

Based on this data, provide a JSON response with this exact structure:
{
  "summary": {
    "predictedRevenue30Days": "৳X,XX,XXX",
    "predictedUnits30Days": "XXX units",
    "topPredictedProduct": "Product Name",
    "profitNextMonth": "৳X,XX,XXX"
  },
  "dailySales": [
    { "date": "YYYY-MM-DD", "quantity": 0, "lower": 0, "upper": 0 }
    // 30 entries for next 30 days
  ],
  "monthlyRevenue": [
    { "month": "YYYY-MM", "revenue": 0, "prevRevenue": 0 }
    // next 3 months predicted + last 3 months as prevRevenue
  ],
  "topProducts": [
    { "name": "Product Name", "predictedQuantity": 0 }
    // top 5 products
  ],
  "profitTrend": [
    { "month": "YYYY-MM", "profit": 0 }
    // last 8 months actual + next 3 months predicted (11 entries total)
  ],
  "insights": {
    "dailySales": "Short insight about daily sales trend",
    "monthlyRevenue": "Short insight about monthly revenue forecast",
    "topProducts": "Short insight about top product demand",
    "profitTrend": "Short insight about profit trend"
  }
}
    `.trim();

    // 5️⃣ Call Groq API using chat completions (correct method)
    const groqResponse = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 4000,
      temperature: 0.4,
    });

    // 6️⃣ Extract response text (correct field)
    let forecastStr = groqResponse.choices[0]?.message?.content || "{}";

    // 7️⃣ Strip markdown code blocks if Groq adds them
    forecastStr = forecastStr
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    // 8️⃣ Parse JSON safely
    let forecastJSON;
    try {
      forecastJSON = JSON.parse(forecastStr);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      console.error("Raw Groq response:", forecastStr);
      return NextResponse.json(
        {
          success: false,
          message: "AI returned invalid data, please try again later",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: forecastJSON });
  } catch (err) {
    console.error("Forecast API error:", err);
    return NextResponse.json(
      {
        success: false,
        message: "AI analysis unavailable, please try again later",
      },
      { status: 500 }
    );
  }
}
