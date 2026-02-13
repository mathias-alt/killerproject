"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderOpen, ListTodo, Clock, CheckCircle2, Timer, Hourglass } from "lucide-react";
import type { Project, TaskWithProject } from "@/lib/types/database";

interface StatsCardsProps {
  projects: Project[];
  tasks: TaskWithProject[];
}

export function StatsCards({ projects, tasks }: StatsCardsProps) {
  const totalProjects = projects.length;
  const totalTasks = tasks.length;
  const inProgress = tasks.filter((t) => t.status === "in_progress").length;
  const completed = tasks.filter((t) => t.status === "done").length;
  const totalEstimatedHours = tasks.reduce((sum, t) => sum + (t.estimated_hours ?? 0), 0);
  const totalActualHours = tasks.reduce((sum, t) => sum + (t.actual_hours ?? 0), 0);
  const remainingHours = tasks
    .filter((t) => t.status !== "done")
    .reduce((sum, t) => sum + (t.estimated_hours ?? 0), 0);

  const stats = [
    {
      title: "Total Projects",
      value: totalProjects,
      description: `${projects.length} active`,
      icon: FolderOpen,
    },
    {
      title: "Total Tasks",
      value: totalTasks,
      description: `${completed} completed`,
      icon: ListTodo,
    },
    {
      title: "In Progress",
      value: inProgress,
      description: `${Math.round((inProgress / (totalTasks || 1)) * 100)}% of tasks`,
      icon: Clock,
    },
    {
      title: "Estimated Hours",
      value: `${totalEstimatedHours}h`,
      description: `Across all tasks`,
      icon: Timer,
    },
    {
      title: "Completed Hours",
      value: `${totalActualHours}h`,
      description: `${completed} tasks done`,
      icon: CheckCircle2,
    },
    {
      title: "Remaining Hours",
      value: `${remainingHours}h`,
      description: `${totalTasks - completed} tasks left`,
      icon: Hourglass,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title} className="h-full border-border/70 bg-card/85">
            <CardHeader className="flex flex-row items-start justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className="rounded-lg bg-primary/10 p-1.5 text-primary">
                <Icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
