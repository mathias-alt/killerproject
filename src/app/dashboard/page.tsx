"use client";

import { useProjects } from "@/hooks/use-projects";
import { useAllTasks } from "@/hooks/use-all-tasks";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { TaskStatusChart, TasksByProjectChart } from "@/components/dashboard/task-chart";

export default function DashboardPage() {
  const { projects, loading: projectsLoading } = useProjects();
  const { tasks, loading: tasksLoading } = useAllTasks();

  if (projectsLoading || tasksLoading) {
    return <div className="p-6 text-muted-foreground">Loading dashboard...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <StatsCards projects={projects} tasks={tasks} />
      <div className="grid gap-4 lg:grid-cols-7">
        <TaskStatusChart tasks={tasks} />
        <TasksByProjectChart tasks={tasks} projects={projects} />
      </div>
    </div>
  );
}
