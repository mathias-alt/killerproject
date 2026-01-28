"use client";

import { use } from "react";
import { useTasks } from "@/hooks/use-tasks";
import { useRealtimeTasks } from "@/hooks/use-realtime";
import { useDependencies } from "@/hooks/use-dependencies";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { GanttChart } from "@/components/gantt/gantt-chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const { tasks, setTasks, loading, createTask, updateTask, deleteTask, moveTask, refetch } =
    useTasks(projectId);
  const { dependencies } = useDependencies(projectId);

  useRealtimeTasks(projectId, setTasks, refetch);

  if (loading) {
    return <div className="p-6 text-muted-foreground">Loading tasks...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <Tabs defaultValue="kanban" className="flex flex-col h-full">
        <div className="border-b px-4">
          <TabsList className="h-10">
            <TabsTrigger value="kanban">Kanban</TabsTrigger>
            <TabsTrigger value="gantt">Gantt</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="kanban" className="flex-1 mt-0">
          <KanbanBoard
            tasks={tasks}
            onCreateTask={createTask}
            onUpdateTask={updateTask}
            onDeleteTask={deleteTask}
            onMoveTask={moveTask}
          />
        </TabsContent>
        <TabsContent value="gantt" className="flex-1 mt-0">
          <GanttChart
            tasks={tasks}
            dependencies={dependencies}
            onUpdateTask={updateTask}
            onDeleteTask={deleteTask}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
