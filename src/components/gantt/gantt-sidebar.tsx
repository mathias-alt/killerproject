"use client";

import { format } from "date-fns";
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
    <div className="flex flex-col h-full" style={{ width: 360 }}>
      {/* Spacer to align with timeline month header */}
      <div style={{ height: headerHeight }} />

      {/* Column headers aligned with task rows */}
      <div
        className="flex items-center border-b bg-muted/30 text-xs font-medium text-muted-foreground"
        style={{ height: rowHeight }}
      >
        <div className="w-24 px-2 border-r h-full flex items-center">Project</div>
        <div className="flex-1 px-3 border-r h-full flex items-center">Task</div>
        <div className="w-16 px-2 text-center border-r h-full flex items-center justify-center">Start</div>
        <div className="w-16 px-2 text-center h-full flex items-center justify-center">End</div>
      </div>

      {/* Task rows */}
      {tasks.map((task, index) => (
        <div
          key={task.id}
          className={cn(
            "flex items-center border-b cursor-pointer transition-colors",
            index % 2 === 0 ? "bg-background" : "bg-muted/20",
            selectedTaskId === task.id && "bg-primary/10",
            "hover:bg-muted/50"
          )}
          style={{ height: rowHeight }}
          onClick={() => onTaskClick(task)}
        >
          <div className="w-24 px-2 flex items-center gap-1.5 min-w-0 border-r">
            {hasProject(task) ? (
              <>
                <div
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: (task as TaskWithProject).project!.color }}
                />
                <span className="text-xs text-muted-foreground truncate">
                  {(task as TaskWithProject).project!.name}
                </span>
              </>
            ) : (
              <span className="text-xs text-muted-foreground">-</span>
            )}
          </div>
          <div className="flex-1 flex items-center px-3 min-w-0 border-r">
            <span className="text-sm truncate">{task.title}</span>
          </div>
          <div className="w-16 px-2 text-xs text-muted-foreground text-center border-r">
            {task.start_date ? format(new Date(task.start_date + "T00:00:00"), "MMM d") : "-"}
          </div>
          <div className="w-16 px-2 text-xs text-muted-foreground text-center">
            {task.end_date ? format(new Date(task.end_date + "T00:00:00"), "MMM d") : "-"}
          </div>
        </div>
      ))}
    </div>
  );
}
