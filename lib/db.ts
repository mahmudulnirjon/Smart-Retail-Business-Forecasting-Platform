import mysql from "mysql2/promise"; // mysql2 library ইম্পোর্ট করা

export const db = mysql.createPool({
  host: process.env.MYSQL_HOST, // .env থেকে MYSQL_HOST নেয়া হবে
  port: Number(process.env.MYSQL_PORT || 3306), // .env থেকে MYSQL_PORT নেয়া হবে (ডিফল্ট 3306)
  user: process.env.MYSQL_USER, // .env থেকে MYSQL_USER নেয়া হবে
  password: process.env.MYSQL_PASSWORD, // .env থেকে MYSQL_PASSWORD নেয়া হবে
  database: process.env.MYSQL_DATABASE, // .env থেকে MYSQL_DATABASE নেয়া হবে
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});