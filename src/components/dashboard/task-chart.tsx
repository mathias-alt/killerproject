"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
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
