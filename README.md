# Smart Retail Business Intelligence & Forecasting Platform

Full-stack SaaS application for real-time retail management, featuring advanced analytics, AI-powered forecasting, and role-based access.

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
* **Real-time updates** every 30 seconds.
* **Responsive UI** for mobile & desktop.

### 3. Product Management

* Add new products, update stock & price.
* Delete existing products.
* Dropdown & table views avoid duplicate listings.

### 4. Sales Management

* Record new sales.
* Real-time stock updates.
* Historical sales data with Dhaka timezone display (AM/PM).
* “See Details” for each sale.

### 5. Expense Tracking

* Add, edit, delete expenses.
* Categories: Rent, Salary, Utilities, etc.
* Expense history table with timezone formatting.
* Monthly summaries integrated with profit calculations.

### 6. AI Forecasting

* Future Sales prediction (next 30 days).
* Monthly Revenue forecasting (next 3 months).
* Product Demand Forecasting (Top-selling products).
* Profit Trend Analysis.
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
* Export to PDF and Excel.
* Top products and employee performance tables.

### 9. Inventory Alerts

* Low stock, overstock, critical alerts.
* Buy Now suggestions.
* Threshold-based warnings.

### 10. Tech Stack

* **Next.js**
* **HTML / CSS / TailwindCSS**
* **JavaScript / TypeScript**
* **MySQL**
* **Chart.js**
* **Groq API **

### 11. Deployment

* Frontend & API deployed on **Vercel**.
* Database hosted on **Railway**.
* Auto-refresh charts and production-ready environment.
* Test all API endpoints after deployment.

### 12. Notes

* All timestamps are Dhaka timezone (UTC+6) with AM/PM format.
* Dropdowns and tables are de-duplicated.
* Mobile-first responsive design.
* Role-based access control enforced.
