"use client";

import { Badge } from "@/components/ui/badge";
import type { TaskWithAssignee, TaskWithProject } from "@/lib/types/database";
import { TASK_STATUS_LABELS } from "@/lib/types/database";

interface GanttSidebarProps {
  tasks: TaskWithAssignee[];
  rowHeight: number;
  onTaskClick: (task: TaskWithAssignee) => void;
}

function hasProject(task: TaskWithAssignee): task is TaskWithProject {
  return "project" in task && (task as TaskWithProject).project != null;
}

export function GanttSidebar({ tasks, rowHeight, onTaskClick }: GanttSidebarProps) {
  return (
    <div className="w-64 shrink-0 border-r bg-background">
      <div className="border-b px-3 py-2 text-xs font-semibold text-muted-foreground h-[52px] flex items-center">
        Task
      </div>
      {tasks.map((task) => (
        <div
          key={task.id}
          className="flex items-center gap-2 border-b px-3 cursor-pointer hover:bg-muted/50"
          style={{ height: rowHeight }}
          onClick={() => onTaskClick(task)}
        >
          {hasProject(task) && (
            <div
              className="h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: (task as TaskWithProject).project!.color }}
            />
          )}
          <span className="text-sm truncate flex-1">{task.title}</span>
          <Badge variant="outline" className="text-[10px] shrink-0">
            {TASK_STATUS_LABELS[task.status]}
          </Badge>
        </div>
      ))}
    </div>
  );
}
