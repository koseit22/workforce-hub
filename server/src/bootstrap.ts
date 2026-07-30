import bcrypt from "bcryptjs";
import { db } from "./db.js";

/** Creates the minimum schema and demo data for an empty production database. */
export async function initializeDatabase() {
  await db.query(`CREATE TABLE IF NOT EXISTS roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(30) NOT NULL UNIQUE
  )`);
  await db.query(`CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id)
  )`);
  await db.query(`CREATE TABLE IF NOT EXISTS projects (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(150) NOT NULL,
    client_name VARCHAR(150) NOT NULL,
    budget_hours DECIMAL(8,2) NOT NULL DEFAULT 0,
    hourly_rate DECIMAL(10,2) NULL,
    status ENUM('active', 'paused', 'completed') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  await db.query(`CREATE TABLE IF NOT EXISTS shifts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    shift_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status ENUM('requested', 'approved', 'rejected') NOT NULL DEFAULT 'requested',
    approver_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (approver_id) REFERENCES users(id)
  )`);
  await db.query(`CREATE TABLE IF NOT EXISTS timesheets (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    project_id INT NOT NULL,
    work_date DATE NOT NULL,
    hours DECIMAL(5,2) NOT NULL,
    description TEXT NOT NULL,
    status ENUM('draft', 'submitted', 'approved', 'rejected') NOT NULL DEFAULT 'submitted',
    approver_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (approver_id) REFERENCES users(id)
  )`);
  await db.query(`CREATE TABLE IF NOT EXISTS approval_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    timesheet_id INT NOT NULL,
    actor_id INT NOT NULL,
    action ENUM('submitted', 'approved', 'rejected') NOT NULL,
    comment TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (timesheet_id) REFERENCES timesheets(id),
    FOREIGN KEY (actor_id) REFERENCES users(id)
  )`);

  await db.query("INSERT IGNORE INTO roles (name) VALUES ('member'), ('manager'), ('admin')");
  await db.query(`INSERT IGNORE INTO projects (name, client_name, budget_hours, hourly_rate, status) VALUES
    ('勤怠連携自動化', '株式会社サンプル', 120, 1800, 'active'),
    ('RPA 運用改善', '社内業務部', 80, 1500, 'active'),
    ('データ移行支援', '株式会社テスト', 60, 2000, 'paused')`);

  const passwordHash = await bcrypt.hash("demo1234", 10);
  await db.execute(`INSERT INTO users (name, email, password_hash, role_id)
    SELECT ?, ?, ?, id FROM roles WHERE name=?
    ON DUPLICATE KEY UPDATE name=VALUES(name)`, ["山田 太郎", "member@example.com", passwordHash, "member"]);
  await db.execute(`INSERT INTO users (name, email, password_hash, role_id)
    SELECT ?, ?, ?, id FROM roles WHERE name=?
    ON DUPLICATE KEY UPDATE name=VALUES(name)`, ["佐藤 花子", "manager@example.com", passwordHash, "manager"]);
}
