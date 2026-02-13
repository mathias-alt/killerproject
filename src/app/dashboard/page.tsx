"use client";

import { useMemo, useState } from "react";
import { useProjects } from "@/hooks/use-projects";
import { useAllTasks } from "@/hooks/use-all-tasks";
import { StatsCards } from "@/components/dashboard/stats-cards";
import {
  TaskStatusChart,
  TasksByProjectChart,
  HoursByMonthChart,
  HoursByProjectChart,
} from "@/components/dashboard/task-chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function DashboardPage() {
  const { projects, loading: projectsLoading } = useProjects();
  const { tasks, loading: tasksLoading } = useAllTasks();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");

  const filteredTasks = useMemo(() => {
    if (selectedProjectId === "all") return tasks;
    return tasks.filter((task) => task.project_id === selectedProjectId);
  }, [tasks, selectedProjectId]);

  const filteredProjects = useMemo(() => {
    if (selectedProjectId === "all") return projects;
    return projects.filter((project) => project.id === selectedProjectId);
  }, [projects, selectedProjectId]);

  const selectedProject =
    selectedProjectId !== "all"
      ? projects.find((project) => project.id === selectedProjectId)
      : null;

  if (projectsLoading || tasksLoading) {
    return <div className="p-8 text-muted-foreground">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6 p-5 md:p-8">
      <section className="rounded-2xl border border-border/70 bg-card/80 px-5 py-5 shadow-[0_16px_40px_-30px_oklch(0.22_0.02_258/0.45)] backdrop-blur-sm md:px-7 md:py-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Overview</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
              {selectedProject ? selectedProject.name : "All Projects"}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {selectedProject
                ? `Dashboard for ${selectedProject.name}`
                : "Overview of all projects"}
            </p>
          </div>
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-full md:w-[240px]">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: project.color }}
                    />
                    {project.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      <StatsCards projects={filteredProjects} tasks={filteredTasks} />

      {selectedProjectId === "all" ? (
        <>
          <div className="grid gap-4 xl:grid-cols-12">
            <TaskStatusChart tasks={tasks} className="xl:col-span-5" />
            <HoursByMonthChart tasks={tasks} className="xl:col-span-7" />
          </div>

          <TasksByProjectChart
            tasks={tasks}
            projects={projects}
            className="w-full"
            chartHeightClassName="h-[380px] min-w-0 sm:h-[520px]"
          />

          <HoursByProjectChart
            tasks={tasks}
            projects={projects}
            className="w-full"
            chartHeightClassName="h-[360px] min-w-0 sm:h-[500px]"
          />
        </>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          <TaskStatusChart tasks={filteredTasks} />
          <HoursByMonthChart tasks={filteredTasks} />
        </div>
      )}
    </div>
  );
}
