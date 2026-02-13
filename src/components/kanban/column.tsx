"use client";

import { Droppable } from "@hello-pangea/dnd";
import { TaskCard } from "./task-card";
import { Button } from "@/components/ui/button";
import { TASK_STATUS_LABELS } from "@/lib/types/database";
import type { TaskStatus, TaskWithAssignee } from "@/lib/types/database";
import { cn } from "@/lib/utils";

interface SubtaskCount {
  total: number;
  completed: number;
}

interface ColumnProps {
  status: TaskStatus;
  tasks: TaskWithAssignee[];
  estimatedHours: number;
  actualHours: number;
  subtaskCounts: Record<string, SubtaskCount>;
  onTaskClick: (task: TaskWithAssignee) => void;
  onAddTask: (status: TaskStatus) => void;
  dndEnabled?: boolean;
}

const columnAccentClasses: Record<TaskStatus, string> = {
  backlog: "ring-slate-400/35",
  todo: "ring-blue-400/35",
  in_progress: "ring-amber-400/35",
  in_review: "ring-violet-400/35",
  done: "ring-emerald-400/35",
};

function formatHours(hours: number): string {
  if (hours === 0) return "0h";
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  return hours % 1 === 0 ? `${hours}h` : `${hours.toFixed(1)}h`;
}

export function Column({
  status,
  tasks,
  estimatedHours,
  actualHours,
  subtaskCounts,
  onTaskClick,
  onAddTask,
  dndEnabled = true,
}: ColumnProps) {
  return (
    <div
      className={cn(
        "flex w-[84vw] max-w-[20rem] shrink-0 flex-col rounded-xl border border-border/70 bg-background p-2 shadow-[0_14px_30px_-26px_oklch(0.22_0.02_258/0.5)] ring-1 sm:w-72",
        columnAccentClasses[status]
      )}
    >
      <div className="mb-1.5 flex items-center justify-between px-2">
        <h3 className="text-sm font-semibold tracking-tight">{TASK_STATUS_LABELS[status]}</h3>
        <span className="text-xs text-muted-foreground">{tasks.length}</span>
      </div>
      <div className="mb-2 px-2 text-xs text-muted-foreground">
        {formatHours(estimatedHours)} / {formatHours(actualHours)}
      </div>
      <Button
        variant="outline"
        size="sm"
        className="mb-2 w-full justify-start text-muted-foreground"
        onClick={() => onAddTask(status)}
      >
        + Add Task
      </Button>
      {dndEnabled ? (
        <Droppable droppableId={status}>
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="flex min-h-[100px] flex-1 flex-col gap-2"
            >
              {tasks.map((task, index) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  index={index}
                  subtaskCount={subtaskCounts[task.id]}
                  onClick={() => onTaskClick(task)}
                  dndEnabled
                />
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      ) : (
        <div className="flex min-h-[100px] flex-1 flex-col gap-2">
          {tasks.map((task, index) => (
            <TaskCard
              key={task.id}
              task={task}
              index={index}
              subtaskCount={subtaskCounts[task.id]}
              onClick={() => onTaskClick(task)}
              dndEnabled={false}
            />
          ))}
        </div>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="mt-2 w-full justify-start text-muted-foreground"
        onClick={() => onAddTask(status)}
      >
        + Add Task
      </Button>
    </div>
  );
}
