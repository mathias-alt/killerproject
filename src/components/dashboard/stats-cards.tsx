"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderOpen, ListTodo, Clock, CheckCircle2, Timer } from "lucide-react";
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
      description: `Across all projects`,
      icon: ListTodo,
    },
    {
      title: "In Progress",
      value: inProgress,
      description: `${Math.round((inProgress / (totalTasks || 1)) * 100)}% of tasks`,
      icon: Clock,
    },
    {
      title: "Completed",
      value: completed,
      description: `${Math.round((completed / (totalTasks || 1)) * 100)}% completion rate`,
      icon: CheckCircle2,
    },
    {
      title: "Estimated Hours",
      value: totalEstimatedHours,
      description: `${totalEstimatedHours}h total across all tasks`,
      icon: Timer,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
