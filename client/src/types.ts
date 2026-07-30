export type Role = "member" | "manager" | "admin";
export type User = { id: number; name: string; role: Role };
export type Project = { id: number; name: string; clientName: string; budgetHours: number; hourlyRate: number | null; status: "active" | "paused" | "completed" };
export type Timesheet = { id: number; projectId: number; workDate: string; hours: number; description: string; status: "submitted" | "approved" | "rejected"; projectName: string; memberName: string };
export type Shift = { id: number; shiftDate: string; startTime: string; endTime: string; status: "requested" | "approved" | "rejected"; memberName: string };
export type Summary = { projectHours: { name: string; budgetHours: number; actualHours: number }[]; memberHours: { name: string; hours: number }[]; pendingApprovals: number };
