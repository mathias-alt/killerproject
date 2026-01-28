"use client";

import { Droppable } from "@hello-pangea/dnd";
import { TaskCard } from "./task-card";
import { Button } from "@/components/ui/button";
import { TASK_STATUS_LABELS } from "@/lib/types/database";
import type { TaskStatus, TaskWithAssignee } from "@/lib/types/database";

interface ColumnProps {
  status: TaskStatus;
  tasks: TaskWithAssignee[];
  onTaskClick: (task: TaskWithAssignee) => void;
  onAddTask: (status: TaskStatus) => void;
}

export function Column({ status, tasks, onTaskClick, onAddTask }: ColumnProps) {
  return (
    <div className="flex w-72 shrink-0 flex-col rounded-lg bg-muted/50 p-2">
      <div className="mb-2 flex items-center justify-between px-2">
        <h3 className="text-sm font-semibold">{TASK_STATUS_LABELS[status]}</h3>
        <span className="text-xs text-muted-foreground">{tasks.length}</span>
      </div>
      <Droppable droppableId={status}>
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex flex-1 flex-col gap-2 min-h-[100px]"
          >
            {tasks.map((task, index) => (
              <TaskCard key={task.id} task={task} index={index} onClick={() => onTaskClick(task)} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
      <Button
        variant="ghost"
        size="sm"
        className="mt-2 w-full text-muted-foreground"
        onClick={() => onAddTask(status)}
      >
        + Add Task
      </Button>
    </div>
  );
}
