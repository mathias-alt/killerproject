"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, TooltipProps } from "recharts";
import { format, parseISO, startOfMonth } from "date-fns";
import type { Project, TaskWithProject } from "@/lib/types/database";
import { TASK_STATUS_LABELS, TASK_STATUSES } from "@/lib/types/database";

const STATUS_COLORS: Record<string, string> = {
  backlog: "#94a3b8",
  todo: "#60a5fa",
  in_progress: "#fbbf24",
  in_review: "#a78bfa",
  done: "#4ade80",
};

interface TaskChartProps {
  tasks: TaskWithProject[];
  projects: Project[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
      <p className="font-medium">{label}</p>
      <p className="text-muted-foreground">{payload[0].value} tasks</p>
    </div>
  );
};

const HoursTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
      <p className="font-medium">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="text-muted-foreground" style={{ color: p.color }}>
          {p.name}: {p.value}h
        </p>
      ))}
    </div>
  );
};

const PieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
      <p className="font-medium">{payload[0].name}</p>
      <p className="text-muted-foreground">{payload[0].value} tasks</p>
    </div>
  );
};

export function TaskStatusChart({ tasks }: { tasks: TaskWithProject[] }) {
  const data = TASK_STATUSES.map((status) => ({
    name: TASK_STATUS_LABELS[status],
    count: tasks.filter((t) => t.status === status).length,
    fill: STATUS_COLORS[status],
  }));

  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>Tasks by Status</CardTitle>
        <CardDescription>Distribution of tasks across statuses</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} style={{ outline: "none" }}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
              <XAxis
                dataKey="name"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                stroke="currentColor"
                opacity={0.5}
              />
              <YAxis
                fontSize={12}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                stroke="currentColor"
                opacity={0.5}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "currentColor", opacity: 0.05 }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} style={{ outline: "none" }}>
                {data.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} style={{ outline: "none" }} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function TasksByProjectChart({ tasks, projects }: TaskChartProps) {
  const data = projects
    .map((project) => ({
      name: project.name,
      count: tasks.filter((t) => t.project_id === project.id).length,
      color: project.color,
    }))
    .filter((d) => d.count > 0);

  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle>Tasks by Project</CardTitle>
        <CardDescription>Task count per project</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart style={{ outline: "none" }}>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="count"
                stroke="none"
                style={{ outline: "none" }}
              >
                {data.map((entry, index) => (
                  <Cell key={index} fill={entry.color} style={{ outline: "none" }} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
              <Legend
                formatter={(value) => <span className="text-sm text-foreground">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function HoursByMonthChart({ tasks }: { tasks: TaskWithProject[] }) {
  const monthMap = new Map<string, { estimated: number; actual: number }>();

  tasks.forEach((t) => {
    try {
      const dateStr = t.end_date || t.start_date || t.created_at;
      if (!dateStr) return;
      const parsed = dateStr.includes("T") ? parseISO(dateStr) : new Date(dateStr + "T00:00:00");
      if (isNaN(parsed.getTime())) return;
      const month = format(parsed, "yyyy-MM");
      const entry = monthMap.get(month) || { estimated: 0, actual: 0 };
      entry.estimated += t.estimated_hours ?? 0;
      entry.actual += t.actual_hours ?? 0;
      monthMap.set(month, entry);
    } catch {
      // Skip tasks with unparseable dates
    }
  });

  const data = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, values]) => ({
      name: format(new Date(month + "-01T00:00:00"), "MMM yyyy"),
      estimated: Math.round(values.estimated * 10) / 10,
      actual: Math.round(values.actual * 10) / 10,
    }));

  if (data.length === 0) return null;

  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>Hours by Month</CardTitle>
        <CardDescription>Estimated vs actual hours</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} style={{ outline: "none" }}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
              <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} stroke="currentColor" opacity={0.5} />
              <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} stroke="currentColor" opacity={0.5} />
              <Tooltip content={<HoursTooltip />} cursor={{ fill: "currentColor", opacity: 0.05 }} />
              <Legend formatter={(value) => <span className="text-sm text-foreground">{value === "estimated" ? "Estimated" : "Actual"}</span>} />
              <Bar dataKey="estimated" fill="#60a5fa" radius={[4, 4, 0, 0]} style={{ outline: "none" }} />
              <Bar dataKey="actual" fill="#4ade80" radius={[4, 4, 0, 0]} style={{ outline: "none" }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function HoursByProjectChart({ tasks, projects }: TaskChartProps) {
  const data = projects
    .map((project) => {
      const projectTasks = tasks.filter((t) => t.project_id === project.id);
      const estimated = projectTasks.reduce((sum, t) => sum + (t.estimated_hours ?? 0), 0);
      const actual = projectTasks.reduce((sum, t) => sum + (t.actual_hours ?? 0), 0);
      return {
        name: project.name,
        estimated: Math.round(estimated * 10) / 10,
        actual: Math.round(actual * 10) / 10,
        color: project.color,
      };
    })
    .filter((d) => d.estimated > 0 || d.actual > 0);

  if (data.length === 0) return null;

  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle>Hours by Project</CardTitle>
        <CardDescription>Estimated vs actual per project</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} style={{ outline: "none" }} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
              <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} stroke="currentColor" opacity={0.5} />
              <YAxis type="category" dataKey="name" fontSize={12} tickLine={false} axisLine={false} stroke="currentColor" opacity={0.5} width={100} />
              <Tooltip content={<HoursTooltip />} cursor={{ fill: "currentColor", opacity: 0.05 }} />
              <Legend formatter={(value) => <span className="text-sm text-foreground">{value === "estimated" ? "Estimated" : "Actual"}</span>} />
              <Bar dataKey="estimated" fill="#60a5fa" radius={[0, 4, 4, 0]} style={{ outline: "none" }} />
              <Bar dataKey="actual" fill="#4ade80" radius={[0, 4, 4, 0]} style={{ outline: "none" }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
