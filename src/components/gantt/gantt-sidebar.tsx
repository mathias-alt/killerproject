"use client";

import type { TaskWithAssignee, TaskWithProject } from "@/lib/types/database";
import { cn } from "@/lib/utils";

interface GanttSidebarProps {
  tasks: TaskWithAssignee[];
  rowHeight: number;
  headerHeight: number;
  onTaskClick: (task: TaskWithAssignee) => void;
  selectedTaskId?: string | null;
}

function hasProject(task: TaskWithAssignee): task is TaskWithProject {
  return "project" in task && (task as TaskWithProject).project != null;
}

export function GanttSidebar({ tasks, rowHeight, headerHeight, onTaskClick, selectedTaskId }: GanttSidebarProps) {
  return (
    <div className="flex h-full w-14 min-w-14 flex-col sm:w-16 sm:min-w-16">
      {/* Header area that matches GanttHeader height exactly */}
      <div
        className="flex shrink-0 items-end border-b border-border/70 bg-muted/15"
        style={{ height: headerHeight, minHeight: headerHeight, maxHeight: headerHeight }}
      >
        <div className="flex w-full items-center pb-1 text-xs font-medium text-muted-foreground">
          <div className="w-full border-r border-border/70 px-1 text-center">Pr</div>
        </div>
      </div>

      {/* Task rows */}
      {tasks.map((task, index) => (
        <div
          key={task.id}
          className={cn(
            "shrink-0 cursor-pointer border-b border-border/70 transition-colors flex items-center",
            index % 2 === 0 ? "bg-background/70" : "bg-muted/20",
            selectedTaskId === task.id && "bg-primary/12",
            "hover:bg-muted/40"
          )}
          style={{ height: rowHeight, minHeight: rowHeight, maxHeight: rowHeight }}
          onClick={() => onTaskClick(task)}
        >
          <div className="flex w-full items-center justify-center border-r border-border/70 px-1">
            {hasProject(task) ? (
              <div
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: (task as TaskWithProject).project!.color }}
              />
            ) : (
              <span className="text-[10px] text-muted-foreground">-</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
