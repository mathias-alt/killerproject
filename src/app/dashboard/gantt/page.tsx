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
    return <div className="p-6 text-muted-foreground">Loading tasks...</div>;
  }

  return (
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
  );
}
