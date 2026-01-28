"use client";

import { useState, useMemo } from "react";
import { useProjects } from "@/hooks/use-projects";
import { useAllTasks } from "@/hooks/use-all-tasks";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { TaskStatusChart, TasksByProjectChart, HoursByMonthChart, HoursByProjectChart } from "@/components/dashboard/task-chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function DashboardPage() {
  const { projects, loading: projectsLoading } = useProjects();
  const { tasks, loading: tasksLoading } = useAllTasks();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");

  const filteredTasks = useMemo(() => {
    if (selectedProjectId === "all") return tasks;
    return tasks.filter((t) => t.project_id === selectedProjectId);
  }, [tasks, selectedProjectId]);

  const filteredProjects = useMemo(() => {
    if (selectedProjectId === "all") return projects;
    return projects.filter((p) => p.id === selectedProjectId);
  }, [projects, selectedProjectId]);

  const selectedProject = selectedProjectId !== "all"
    ? projects.find((p) => p.id === selectedProjectId)
    : null;

  if (projectsLoading || tasksLoading) {
    return <div className="p-6 text-muted-foreground">Loading dashboard...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {selectedProject ? selectedProject.name : "All Projects"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {selectedProject
              ? `Dashboard for ${selectedProject.name}`
              : "Overview of all projects"}
          </p>
        </div>
        <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
          <SelectTrigger className="w-[200px]">
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

      <StatsCards projects={filteredProjects} tasks={filteredTasks} />

      <div className="grid gap-4 lg:grid-cols-7">
        <TaskStatusChart tasks={filteredTasks} />
        {selectedProjectId === "all" ? (
          <TasksByProjectChart tasks={tasks} projects={projects} />
        ) : (
          <HoursByMonthChart tasks={filteredTasks} />
        )}
      </div>

      {selectedProjectId === "all" && (
        <div className="grid gap-4 lg:grid-cols-7">
          <HoursByMonthChart tasks={tasks} />
          <HoursByProjectChart tasks={tasks} projects={projects} />
        </div>
      )}
    </div>
  );
}
