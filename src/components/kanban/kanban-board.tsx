"use client";

import { useState } from "react";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { Column } from "./column";
import { TaskDialog } from "@/components/tasks/task-dialog";
import { TASK_STATUSES } from "@/lib/types/database";
import type { Task, TaskStatus, TaskWithAssignee, Project } from "@/lib/types/database";

interface KanbanBoardProps {
  tasks: TaskWithAssignee[];
  projects?: Project[];
  onCreateTask: (data: Partial<Task> & { title: string }) => Promise<{ data: unknown; error: unknown }>;
  onUpdateTask: (id: string, updates: Partial<Task>) => Promise<{ data: unknown; error: unknown }>;
  onDeleteTask: (id: string) => Promise<{ error: unknown }>;
  onMoveTask: (id: string, status: TaskStatus, order: number) => Promise<{ data: unknown; error: unknown }>;
}

export function KanbanBoard({ tasks, projects, onCreateTask, onUpdateTask, onDeleteTask, onMoveTask }: KanbanBoardProps) {
  const [selectedTask, setSelectedTask] = useState<TaskWithAssignee | null>(null);
  const [newTaskStatus, setNewTaskStatus] = useState<TaskStatus | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  function getTasksByStatus(status: TaskStatus) {
    return tasks.filter((t) => t.status === status).sort((a, b) => a.order - b.order);
  }

  function handleDragEnd(result: DropResult) {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const newStatus = destination.droppableId as TaskStatus;
    const newOrder = destination.index;
    onMoveTask(draggableId, newStatus, newOrder);
  }

  return (
    <>
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto p-4">
          {TASK_STATUSES.map((status) => (
            <Column
              key={status}
              status={status}
              tasks={getTasksByStatus(status)}
              onTaskClick={(task) => {
                setSelectedTask(task);
                setEditDialogOpen(true);
              }}
              onAddTask={(s) => {
                setNewTaskStatus(s);
                setCreateDialogOpen(true);
              }}
            />
          ))}
        </div>
      </DragDropContext>

      <TaskDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        task={selectedTask}
        onSubmit={async (data) => {
          if (selectedTask) await onUpdateTask(selectedTask.id, data);
        }}
        onDelete={
          selectedTask
            ? async () => {
                await onDeleteTask(selectedTask.id);
                setEditDialogOpen(false);
              }
            : undefined
        }
      />

      <TaskDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        defaultStatus={newTaskStatus ?? "todo"}
        projects={projects}
        onSubmit={async (data) => {
          await onCreateTask(data);
        }}
      />
    </>
  );
}
