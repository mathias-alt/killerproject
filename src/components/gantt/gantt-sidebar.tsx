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
    <div className="shrink-0 border-r bg-background flex flex-col" style={{ width: 360 }}>
      {/* Header row matching the timeline header height */}
      <div
        className="border-b bg-muted/30 flex items-end text-xs font-medium text-muted-foreground"
        style={{ height: headerHeight }}
      >
        <div className="w-24 px-2 py-2 border-r">Project</div>
        <div className="flex-1 px-3 py-2 border-r">Task</div>
        <div className="w-16 px-2 py-2 text-center border-r">Start</div>
        <div className="w-16 px-2 py-2 text-center">End</div>
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
