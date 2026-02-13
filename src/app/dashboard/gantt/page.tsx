"use client";

import { useAllTasks } from "@/hooks/use-all-tasks";
import { useProjects } from "@/hooks/use-projects";
import { useProfiles } from "@/hooks/use-profiles";
import { useRealtimeAllTasks } from "@/hooks/use-realtime";
import { useDependencies } from "@/hooks/use-dependencies";
import { GanttChart } from "@/components/gantt/gantt-chart";

export default function GanttPage() {
  const { tasks, setTasks, loading, updateTask, deleteTask, refetch } = useAllTasks();
  const { projects } = useProjects();
  const { profiles } = useProfiles();
  const { dependencies, addDependency, removeDependency } = useDependencies();

  useRealtimeAllTasks(setTasks, refetch);

  if (loading) {
    return <div className="p-8 text-muted-foreground">Loading tasks...</div>;
  }

  return (
    <div className="space-y-6 p-5 md:p-8">
      <section className="rounded-2xl border border-border/70 bg-card/80 px-5 py-5 shadow-[0_16px_40px_-30px_oklch(0.22_0.02_258/0.45)] backdrop-blur-sm md:px-7 md:py-6">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Planning</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">Gantt Chart</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Plan timelines, adjust schedules, and manage dependencies in a single view.
        </p>
      </section>

      <GanttChart
        tasks={tasks}
        projects={projects}
        profiles={profiles}
        dependencies={dependencies}
        onUpdateTask={updateTask}
        onDeleteTask={deleteTask}
        onAddDependency={addDependency}
        onRemoveDependency={removeDependency}
      />
    </div>
  );
}
