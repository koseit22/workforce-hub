import "dotenv/config";
import bcrypt from "bcryptjs";
import { db } from "./db.js";

const users = [
  ["山田 太郎", "member@example.com", "member"],
  ["佐藤 花子", "manager@example.com", "manager"],
];

for (const [name, email, role] of users) {
  const hash = await bcrypt.hash("demo1234", 10);
  await db.execute(`INSERT INTO users (name, email, password_hash, role_id) SELECT ?, ?, ?, id FROM roles WHERE name=? ON DUPLICATE KEY UPDATE name=VALUES(name)`, [name, email, hash, role]);
}
console.log("Seed complete. member@example.com / demo1234, manager@example.com / demo1234");
await db.end();
