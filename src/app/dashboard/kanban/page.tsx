"use client";

import { useAllTasks } from "@/hooks/use-all-tasks";
import { useProjects } from "@/hooks/use-projects";
import { useProfiles } from "@/hooks/use-profiles";
import { useRealtimeAllTasks } from "@/hooks/use-realtime";
import { KanbanBoard } from "@/components/kanban/kanban-board";

export default function KanbanPage() {
  const { tasks, setTasks, loading, createTask, updateTask, deleteTask, moveTask, createSubtask, toggleSubtask, getSubtasks, refetch } =
    useAllTasks();
  const { projects } = useProjects();
  const { profiles } = useProfiles();

  useRealtimeAllTasks(setTasks, refetch);

  if (loading) {
    return <div className="p-8 text-muted-foreground">Loading tasks...</div>;
  }

  return (
    <div className="space-y-6 p-5 md:p-8">
      <section className="rounded-2xl border border-border/70 bg-card/80 px-5 py-5 shadow-[0_16px_40px_-30px_oklch(0.22_0.02_258/0.45)] backdrop-blur-sm md:px-7 md:py-6">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Execution</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">Kanban Board</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Organize work by status, filter quickly, and drag tasks across the pipeline.
        </p>
      </section>

      <KanbanBoard
        tasks={tasks}
        projects={projects}
        profiles={profiles}
        onCreateTask={createTask}
        onUpdateTask={updateTask}
        onDeleteTask={deleteTask}
        onMoveTask={moveTask}
        onCreateSubtask={createSubtask}
        onToggleSubtask={toggleSubtask}
        getSubtasks={getSubtasks}
      />
    </div>
  );
}
