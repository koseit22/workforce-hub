import "dotenv/config";
import mysql from "mysql2/promise";

export const db = mysql.createPool({
  host: process.env.MYSQL_HOST ?? "localhost",
  port: Number(process.env.MYSQL_PORT ?? 3306),
  database: process.env.MYSQL_DATABASE ?? "workforce_hub",
  user: process.env.MYSQL_USER ?? "workforce",
  password: process.env.MYSQL_PASSWORD ?? "workforce_pass",
  dateStrings: true,
  waitForConnections: true,
  connectionLimit: 10,
});
