import "dotenv/config";
import bcrypt from "bcryptjs";
import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { RowDataPacket } from "mysql2";
import { z } from "zod";
import { db } from "./db.js";

type AuthUser = { id: number; name: string; role: "member" | "manager" | "admin" };
type AuthRequest = Request & { user?: AuthUser };
const secret = process.env.JWT_SECRET ?? "development-secret";
const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173" }));
app.use(express.json());

function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ message: "認証が必要です。" });
  try { req.user = jwt.verify(token, secret) as AuthUser; next(); } catch { return res.status(401).json({ message: "セッションが無効です。" }); }
}
function managerOnly(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user || !["manager", "admin"].includes(req.user.role)) return res.status(403).json({ message: "承認権限がありません。" });
  next();
}

app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/api/auth/login", async (req, res) => {
  const parsed = z.object({ email: z.string().email(), password: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "メールアドレスとパスワードを確認してください。" });
  const [rows] = await db.query<RowDataPacket[]>(`SELECT u.id, u.name, u.email, u.password_hash, r.name AS role FROM users u JOIN roles r ON r.id=u.role_id WHERE u.email=?`, [parsed.data.email]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(parsed.data.password, user.password_hash))) return res.status(401).json({ message: "メールアドレスまたはパスワードが違います。" });
  const payload: AuthUser = { id: user.id, name: user.name, role: user.role };
  return res.json({ token: jwt.sign(payload, secret, { expiresIn: "8h" }), user: payload });
});

app.get("/api/projects", authenticate, async (_req, res) => {
  const [rows] = await db.query<RowDataPacket[]>(`SELECT id, name, client_name AS clientName, budget_hours AS budgetHours, hourly_rate AS hourlyRate, status FROM projects ORDER BY status, name`);
  res.json(rows);
});

app.post("/api/projects", authenticate, managerOnly, async (req, res) => {
  const parsed = z.object({ name: z.string().trim().min(2).max(150), clientName: z.string().trim().min(2).max(150), budgetHours: z.number().positive().max(100000), hourlyRate: z.number().nonnegative().max(100000).nullable().optional() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "プロジェクト名・取引先・予算時間を確認してください。" });
  const project = parsed.data;
  const [result] = await db.execute(`INSERT INTO projects (name, client_name, budget_hours, hourly_rate, status) VALUES (?, ?, ?, ?, 'active')`, [project.name, project.clientName, project.budgetHours, project.hourlyRate ?? null]);
  res.status(201).json({ id: (result as { insertId: number }).insertId });
});

app.patch("/api/projects/:id", authenticate, managerOnly, async (req, res) => {
  const parsed = z.object({ name: z.string().trim().min(2).max(150), clientName: z.string().trim().min(2).max(150), budgetHours: z.number().positive().max(100000), hourlyRate: z.number().nonnegative().max(100000).nullable(), status: z.enum(["active", "paused", "completed"]) }).safeParse(req.body);
  const id = Number(req.params.id);
  if (!parsed.success || !Number.isInteger(id)) return res.status(400).json({ message: "プロジェクトの入力内容を確認してください。" });
  const project = parsed.data;
  await db.execute(`UPDATE projects SET name=?, client_name=?, budget_hours=?, hourly_rate=?, status=? WHERE id=?`, [project.name, project.clientName, project.budgetHours, project.hourlyRate, project.status, id]);
  res.json({ ok: true });
});

app.delete("/api/projects/:id", authenticate, managerOnly, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: "プロジェクトを確認してください。" });
  const [usage] = await db.query<RowDataPacket[]>(`SELECT COUNT(*) AS count FROM timesheets WHERE project_id=?`, [id]);
  if (Number(usage[0].count) > 0) return res.status(409).json({ message: "作業記録があるプロジェクトは削除できません。状態を「完了」に変更してください。" });
  const [result] = await db.execute(`DELETE FROM projects WHERE id=?`, [id]);
  if ((result as { affectedRows: number }).affectedRows === 0) return res.status(404).json({ message: "プロジェクトが見つかりません。" });
  res.json({ ok: true });
});

app.get("/api/timesheets", authenticate, async (req: AuthRequest, res) => {
  const [rows] = await db.query<RowDataPacket[]>(`SELECT t.id, t.work_date AS workDate, t.hours, t.description, t.status, p.name AS projectName, u.name AS memberName FROM timesheets t JOIN projects p ON p.id=t.project_id JOIN users u ON u.id=t.user_id WHERE (? IN ('manager','admin') OR t.user_id=?) ORDER BY t.work_date DESC`, [req.user!.role, req.user!.id]);
  res.json(rows);
});

app.get("/api/shifts", authenticate, async (req: AuthRequest, res) => {
  const [rows] = await db.query<RowDataPacket[]>(`SELECT s.id, s.shift_date AS shiftDate, TIME_FORMAT(s.start_time, '%H:%i') AS startTime, TIME_FORMAT(s.end_time, '%H:%i') AS endTime, s.status, u.name AS memberName FROM shifts s JOIN users u ON u.id=s.user_id WHERE (? IN ('manager','admin') OR s.user_id=?) ORDER BY s.shift_date ASC, s.start_time ASC`, [req.user!.role, req.user!.id]);
  res.json(rows);
});

app.post("/api/shifts", authenticate, async (req: AuthRequest, res) => {
  const parsed = z.object({ shiftDate: z.string().date(), startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/) }).safeParse(req.body);
  if (!parsed.success || parsed.data.startTime >= parsed.data.endTime) return res.status(400).json({ message: "日付と開始・終了時刻を確認してください。" });
  const item = parsed.data;
  const [result] = await db.execute(`INSERT INTO shifts (user_id, shift_date, start_time, end_time) VALUES (?, ?, ?, ?)`, [req.user!.id, item.shiftDate, item.startTime, item.endTime]);
  res.status(201).json({ id: (result as { insertId: number }).insertId });
});

app.patch("/api/shifts/:id/approve", authenticate, managerOnly, async (req: AuthRequest, res) => {
  const parsed = z.object({ action: z.enum(["approved", "rejected"]) }).safeParse(req.body);
  const id = Number(req.params.id);
  if (!parsed.success || !Number.isInteger(id)) return res.status(400).json({ message: "承認内容を確認してください。" });
  await db.execute(`UPDATE shifts SET status=?, approver_id=? WHERE id=?`, [parsed.data.action, req.user!.id, id]);
  res.json({ ok: true });
});

app.post("/api/timesheets", authenticate, async (req: AuthRequest, res) => {
  const parsed = z.object({ projectId: z.number().int().positive(), workDate: z.string().date(), hours: z.number().positive().max(24), description: z.string().min(3).max(500) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "入力内容を確認してください。" });
  const item = parsed.data;
  const [result] = await db.execute(`INSERT INTO timesheets (user_id, project_id, work_date, hours, description, status) VALUES (?, ?, ?, ?, ?, 'submitted')`, [req.user!.id, item.projectId, item.workDate, item.hours, item.description]);
  const id = (result as { insertId: number }).insertId;
  await db.execute(`INSERT INTO approval_logs (timesheet_id, actor_id, action, comment) VALUES (?, ?, 'submitted', '工数を提出')`, [id, req.user!.id]);
  res.status(201).json({ id });
});

app.patch("/api/timesheets/:id/approve", authenticate, managerOnly, async (req: AuthRequest, res) => {
  const parsed = z.object({ action: z.enum(["approved", "rejected"]), comment: z.string().max(500).optional() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "承認内容を確認してください。" });
  const id = Number(req.params.id);
  await db.execute(`UPDATE timesheets SET status=?, approver_id=? WHERE id=?`, [parsed.data.action, req.user!.id, id]);
  await db.execute(`INSERT INTO approval_logs (timesheet_id, actor_id, action, comment) VALUES (?, ?, ?, ?)`, [id, req.user!.id, parsed.data.action, parsed.data.comment ?? null]);
  res.json({ ok: true });
});

app.get("/api/dashboard/summary", authenticate, managerOnly, async (_req, res) => {
  const [projectHours] = await db.query<RowDataPacket[]>(`SELECT p.name, p.budget_hours AS budgetHours, COALESCE(SUM(CASE WHEN t.status='approved' THEN t.hours END), 0) AS actualHours FROM projects p LEFT JOIN timesheets t ON t.project_id=p.id GROUP BY p.id ORDER BY actualHours DESC`);
  const [memberHours] = await db.query<RowDataPacket[]>(`SELECT u.name, COALESCE(SUM(CASE WHEN t.status='approved' THEN t.hours END), 0) AS hours FROM users u LEFT JOIN timesheets t ON t.user_id=u.id GROUP BY u.id ORDER BY hours DESC`);
  const [pending] = await db.query<RowDataPacket[]>(`SELECT COUNT(*) AS count FROM timesheets WHERE status='submitted'`);
  res.json({ projectHours, memberHours, pendingApprovals: pending[0].count });
});

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => { console.error(error); res.status(500).json({ message: "サーバーエラーが発生しました。" }); });
app.listen(Number(process.env.PORT ?? 3001), () => console.log("API listening on http://localhost:3001"));
