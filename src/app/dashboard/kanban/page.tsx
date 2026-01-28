"use client";

import { useAllTasks } from "@/hooks/use-all-tasks";
import { useProjects } from "@/hooks/use-projects";
import { useRealtimeAllTasks } from "@/hooks/use-realtime";
import { KanbanBoard } from "@/components/kanban/kanban-board";

export default function KanbanPage() {
  const { tasks, setTasks, loading, createTask, updateTask, deleteTask, moveTask, refetch } =
    useAllTasks();
  const { projects } = useProjects();

  useRealtimeAllTasks(setTasks, refetch);

  if (loading) {
    return <div className="p-6 text-muted-foreground">Loading tasks...</div>;
  }

  return (
    <KanbanBoard
      tasks={tasks}
      projects={projects}
      onCreateTask={createTask}
      onUpdateTask={updateTask}
      onDeleteTask={deleteTask}
      onMoveTask={moveTask}
    />
  );
}
