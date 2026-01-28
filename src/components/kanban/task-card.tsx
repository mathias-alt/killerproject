"use client";

import { Draggable } from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import type { TaskWithAssignee, TaskWithProject } from "@/lib/types/database";
import { cn } from "@/lib/utils";

const priorityColors: Record<string, string> = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

interface TaskCardProps {
  task: TaskWithAssignee;
  index: number;
  onClick: () => void;
}

function hasProject(task: TaskWithAssignee): task is TaskWithProject {
  return "project" in task && (task as TaskWithProject).project != null;
}

export function TaskCard({ task, index, onClick }: TaskCardProps) {
  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <Card
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={cn(
            "p-3 cursor-pointer hover:shadow-sm transition-shadow",
            snapshot.isDragging && "shadow-lg"
          )}
          onClick={onClick}
        >
          {hasProject(task) && (
            <div className="flex items-center gap-1.5 mb-1.5">
              <div
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: (task as TaskWithProject).project!.color }}
              />
              <span className="text-[10px] font-medium text-muted-foreground truncate">
                {(task as TaskWithProject).project!.name}
              </span>
            </div>
          )}
          <p className="text-sm font-medium mb-2">{task.title}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className={cn("text-xs", priorityColors[task.priority])}>
              {task.priority}
            </Badge>
            {task.start_date && task.end_date && (
              <span className="text-xs text-muted-foreground">
                {format(new Date(task.start_date), "MMM d")} - {format(new Date(task.end_date), "MMM d")}
              </span>
            )}
          </div>
          {task.assignee && (
            <p className="text-xs text-muted-foreground mt-2">{task.assignee.full_name}</p>
          )}
        </Card>
      )}
    </Draggable>
  );
}
