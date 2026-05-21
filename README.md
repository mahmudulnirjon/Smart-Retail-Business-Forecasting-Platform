# Smart Retail Business Intelligence & Forecasting Platform

**Full-stack SaaS application** for real-time retail management, featuring advanced analytics, AI-powered forecasting, and role-based access.

## Features

### 1. User Roles & Authentication

* **Admin**: Full access to dashboard, product & employee management, sales, inventory, AI forecasting, anomaly detection.
* **Manager**: Access to sales, inventory, reports, employee performance.
* **Sales Employee**: Can add sales, view personal sales history, add products.

### 2. Dashboard

* **KPI Cards**: Total Sales, Revenue, Units Sold, Top Products, Top Employees.
* **Charts**:

  * Bar, Line, and Pie charts for sales, revenue, profit, and product performance.
  * Heatmaps for day/time sales trends.
* **Real-time updates** every 30–60 seconds.
* **Responsive UI** for mobile & desktop.

### 3. Product Management

* Add new products, update stock & price.
* Delete existing products.
* Dropdown & table views avoid duplicate listings.

### 4. Sales Management

* Record new sales.
* Real-time stock updates.
* Historical sales data with **Dhaka timezone** display (AM/PM).
* “See Details” for each sale.

### 5. Expense Tracking

* Add, edit, delete expenses.
* Categories: Rent, Salary, Utilities, etc.
* Expense history table with timezone formatting.
* Monthly summaries integrated with profit calculations.

### 6. AI Forecasting

* **Future Sales** prediction (next 30 days).
* **Monthly Revenue** forecasting (next 3 months).
* **Product Demand Forecasting** (Top-selling products).
* **Profit Trend Analysis**.
* AI-generated insights displayed alongside charts.
* Role-based: only Admin & Manager.

### 7. Anomaly Detection

* Detect unusual sales spikes.
* Detect sudden revenue drops.
* Detect suspicious expenses.
* Alerts with severity levels and dismissible notifications.

### 8. Reports

* Summary reports: Daily/Weekly/Monthly/Quarterly/Yearly.
* Filter by product, employee, or date.
* Export to **PDF** and **Excel**.
* Top products and employee performance tables.

### 9. Inventory Alerts

* Low stock, overstock, critical alerts.
* Buy Now suggestions.
* Threshold-based warnings.

### 10. Tech Stack

* **Frontend**: Next.js, Tailwind CSS, React
* **Backend**: Next.js API Routes, Node.js
* **Database**: MySQL (Railway / PlanetScale)
* **AI Integration**: Groq API
* **Charts**: Chart.js (Line, Bar, Pie)
* **Hosting**: Vercel (Frontend + API), Railway (Database)
* **Environment Variables**: `.env.local` for DB and API keys

### 11. Deployment

* Frontend & API deployed on **Vercel**
* Database hosted on **Railway**
* Auto-refresh and production-ready environment.
* Test all API endpoints after deployment.

### 12. Notes

* **Timezone**: All timestamps are Dhaka (UTC+6) formatted with AM/PM.
* **Duplicate prevention**: All dropdowns and tables are de-duplicated.
* **Responsive Design**: Mobile-first design with hover effects and animations.
* **Security**: Role-based access control.

