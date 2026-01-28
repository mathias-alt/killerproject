"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
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
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
              <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
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
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="count"
                label={(props) => `${props.name} (${props.value})`}
              >
                {data.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
