"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { format, parseISO } from "date-fns";
import type { Project, TaskWithProject } from "@/lib/types/database";
import { TASK_STATUS_LABELS, TASK_STATUSES } from "@/lib/types/database";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  backlog: "#94a3b8",
  todo: "#60a5fa",
  in_progress: "#fbbf24",
  in_review: "#a78bfa",
  done: "#4ade80",
};

interface BaseChartProps {
  className?: string;
  chartHeightClassName?: string;
}

interface TaskChartProps extends BaseChartProps {
  tasks: TaskWithProject[];
  projects: Project[];
}

interface SingleTaskChartProps extends BaseChartProps {
  tasks: TaskWithProject[];
}

interface ChartTooltipPayload {
  name?: string;
  value?: number;
  color?: string;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: ChartTooltipPayload[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: ChartTooltipProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
      <p className="font-medium">{label}</p>
      <p className="text-muted-foreground">{payload[0].value} tasks</p>
    </div>
  );
};

const HoursTooltip = ({ active, payload, label }: ChartTooltipProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
      <p className="font-medium">{label}</p>
      {payload.map((item, index) => (
        <p
          key={`${item.name ?? "series"}-${index}`}
          className="text-muted-foreground"
          style={{ color: item.color }}
        >
          {item.name}: {item.value}h
        </p>
      ))}
    </div>
  );
};

const PieTooltip = ({ active, payload }: ChartTooltipProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
      <p className="font-medium">{payload[0].name}</p>
      <p className="text-muted-foreground">{payload[0].value} tasks</p>
    </div>
  );
};

function ChartViewport({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasSize, setHasSize] = useState(false);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    let frame = 0;
    const updateSize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const { width, height } = element.getBoundingClientRect();
        setHasSize(width > 0 && height > 0);
      });
    };

    updateSize();

    if (typeof ResizeObserver === "undefined") {
      return () => {
        cancelAnimationFrame(frame);
      };
    }

    const observer = new ResizeObserver(updateSize);
    observer.observe(element);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className={cn("min-w-0", className)}>
      {hasSize ? children : <div className="h-full w-full" />}
    </div>
  );
}

export function TaskStatusChart({ tasks, className, chartHeightClassName }: SingleTaskChartProps) {
  const data = TASK_STATUSES.map((status) => ({
    name: TASK_STATUS_LABELS[status],
    count: tasks.filter((t) => t.status === status).length,
    fill: STATUS_COLORS[status],
  }));

  return (
    <Card className={cn("min-w-0 border-border/70 bg-card/85", className)}>
      <CardHeader>
        <CardTitle>Tasks by Status</CardTitle>
        <CardDescription>Distribution of tasks across statuses</CardDescription>
      </CardHeader>
      <CardContent className="min-w-0">
        <ChartViewport className={chartHeightClassName ?? "h-[250px] min-w-0 sm:h-[320px]"}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={240}>
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
        </ChartViewport>
      </CardContent>
    </Card>
  );
}

export function TasksByProjectChart({ tasks, projects, className, chartHeightClassName }: TaskChartProps) {
  const data = projects
    .map((project) => ({
      name: project.name,
      count: tasks.filter((t) => t.project_id === project.id).length,
      color: project.color,
    }))
    .filter((d) => d.count > 0);

  return (
    <Card className={cn("min-w-0 border-border/70 bg-card/85", className)}>
      <CardHeader>
        <CardTitle>Tasks by Project</CardTitle>
        <CardDescription>Task count per project</CardDescription>
      </CardHeader>
      <CardContent className="min-w-0">
        <ChartViewport className={chartHeightClassName ?? "h-[340px] min-w-0 sm:h-[430px]"}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={240}>
            <PieChart style={{ outline: "none" }}>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius="52%"
                outerRadius="78%"
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
                verticalAlign="bottom"
                formatter={(value) => <span className="text-sm text-foreground">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartViewport>
      </CardContent>
    </Card>
  );
}

export function HoursByMonthChart({ tasks, className, chartHeightClassName }: SingleTaskChartProps) {
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
    <Card className={cn("min-w-0 border-border/70 bg-card/85", className)}>
      <CardHeader>
        <CardTitle>Hours by Month</CardTitle>
        <CardDescription>Estimated vs actual hours</CardDescription>
      </CardHeader>
      <CardContent className="min-w-0">
        <ChartViewport className={chartHeightClassName ?? "h-[250px] min-w-0 sm:h-[320px]"}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={240}>
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
        </ChartViewport>
      </CardContent>
    </Card>
  );
}

export function HoursByProjectChart({ tasks, projects, className, chartHeightClassName }: TaskChartProps) {
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
    <Card className={cn("min-w-0 border-border/70 bg-card/85", className)}>
      <CardHeader>
        <CardTitle>Hours by Project</CardTitle>
        <CardDescription>Estimated vs actual per project</CardDescription>
      </CardHeader>
      <CardContent className="min-w-0">
        <ChartViewport className={chartHeightClassName ?? "h-[330px] min-w-0 sm:h-[420px]"}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={240}>
            <BarChart data={data} style={{ outline: "none" }} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
              <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} stroke="currentColor" opacity={0.5} />
              <YAxis type="category" dataKey="name" fontSize={12} tickLine={false} axisLine={false} stroke="currentColor" opacity={0.5} width={120} />
              <Tooltip content={<HoursTooltip />} cursor={{ fill: "currentColor", opacity: 0.05 }} />
              <Legend formatter={(value) => <span className="text-sm text-foreground">{value === "estimated" ? "Estimated" : "Actual"}</span>} />
              <Bar dataKey="estimated" fill="#60a5fa" radius={[0, 4, 4, 0]} style={{ outline: "none" }} />
              <Bar dataKey="actual" fill="#4ade80" radius={[0, 4, 4, 0]} style={{ outline: "none" }} />
            </BarChart>
          </ResponsiveContainer>
        </ChartViewport>
      </CardContent>
    </Card>
  );
}
