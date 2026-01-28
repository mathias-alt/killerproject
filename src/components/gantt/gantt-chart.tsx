"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { addDays, subDays, differenceInDays, min, max, startOfDay } from "date-fns";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { GanttHeader, type ZoomLevel } from "./gantt-header";
import { GanttBar } from "./gantt-bar";
import { GanttSidebar } from "./gantt-sidebar";
import { TaskDialog } from "@/components/tasks/task-dialog";
import type { Task, TaskWithAssignee, TaskDependency } from "@/lib/types/database";

const ZOOM_CONFIG: Record<ZoomLevel, number> = {
  day: 40,
  week: 20,
  month: 8,
};

const ROW_HEIGHT = 36;

interface GanttChartProps {
  tasks: TaskWithAssignee[];
  dependencies?: TaskDependency[];
  onUpdateTask: (id: string, updates: Partial<Task>) => Promise<{ data: unknown; error: unknown }>;
  onDeleteTask: (id: string) => Promise<{ error: unknown }>;
}

export function GanttChart({ tasks, dependencies = [], onUpdateTask, onDeleteTask }: GanttChartProps) {
  const [zoom, setZoom] = useState<ZoomLevel>("day");
  const [selectedTask, setSelectedTask] = useState<TaskWithAssignee | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const dayWidth = ZOOM_CONFIG[zoom];

  const tasksWithDates = useMemo(
    () => tasks.filter((t) => t.start_date && t.end_date),
    [tasks]
  );

  const taskIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    tasksWithDates.forEach((t, i) => map.set(t.id, i));
    return map;
  }, [tasksWithDates]);

  const { timelineStart, timelineEnd } = useMemo(() => {
    if (tasksWithDates.length === 0) {
      const today = startOfDay(new Date());
      return { timelineStart: subDays(today, 7), timelineEnd: addDays(today, 30) };
    }
    const starts = tasksWithDates.map((t) => new Date(t.start_date!));
    const ends = tasksWithDates.map((t) => new Date(t.end_date!));
    return {
      timelineStart: subDays(min(starts), 7),
      timelineEnd: addDays(max(ends), 14),
    };
  }, [tasksWithDates]);

  const totalDays = differenceInDays(timelineEnd, timelineStart) + 1;
  const timelineWidth = totalDays * dayWidth;

  const today = startOfDay(new Date());
  const todayOffset = differenceInDays(today, timelineStart) * dayWidth;

  // Get all tasks that depend on a given task (downstream dependents)
  const getDependents = useCallback((taskId: string): string[] => {
    return dependencies
      .filter((d) => d.depends_on_id === taskId)
      .map((d) => d.task_id);
  }, [dependencies]);

  // When dragging a task, also shift its dependents
  const handleDragEnd = useCallback(async (taskId: string, newStart: string, newEnd: string) => {
    const task = tasksWithDates.find((t) => t.id === taskId);
    if (!task || !task.start_date) return;

    const oldStart = new Date(task.start_date);
    const draggedNewStart = new Date(newStart);
    const daysDelta = differenceInDays(draggedNewStart, oldStart);

    // Update the dragged task
    await onUpdateTask(taskId, { start_date: newStart, end_date: newEnd });

    // Update dependents by the same delta
    if (daysDelta !== 0) {
      const dependentIds = getDependents(taskId);
      for (const depId of dependentIds) {
        const depTask = tasksWithDates.find((t) => t.id === depId);
        if (depTask?.start_date && depTask?.end_date) {
          const depStart = new Date(depTask.start_date);
          const depEnd = new Date(depTask.end_date);
          depStart.setDate(depStart.getDate() + daysDelta);
          depEnd.setDate(depEnd.getDate() + daysDelta);
          await onUpdateTask(depId, {
            start_date: depStart.toISOString().split("T")[0],
            end_date: depEnd.toISOString().split("T")[0],
          });
        }
      }
    }
  }, [tasksWithDates, onUpdateTask, getDependents]);

  // Compute dependency arrows
  const arrows = useMemo(() => {
    return dependencies
      .map((dep) => {
        const fromIdx = taskIndexMap.get(dep.depends_on_id);
        const toIdx = taskIndexMap.get(dep.task_id);
        if (fromIdx === undefined || toIdx === undefined) return null;

        const fromTask = tasksWithDates[fromIdx];
        const toTask = tasksWithDates[toIdx];
        if (!fromTask.end_date || !toTask.start_date) return null;

        const fromEnd = differenceInDays(new Date(fromTask.end_date), timelineStart) + 1;
        const toStart = differenceInDays(new Date(toTask.start_date), timelineStart);

        const x1 = fromEnd * dayWidth;
        const y1 = fromIdx * ROW_HEIGHT + ROW_HEIGHT / 2;
        const x2 = toStart * dayWidth;
        const y2 = toIdx * ROW_HEIGHT + ROW_HEIGHT / 2;

        return { x1, y1, x2, y2, id: dep.id };
      })
      .filter(Boolean) as { x1: number; y1: number; x2: number; y2: number; id: string }[];
  }, [dependencies, taskIndexMap, tasksWithDates, timelineStart, dayWidth]);

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full">
        {/* Toolbar */}
        <div className="flex items-center gap-2 p-2 border-b">
          <span className="text-sm font-medium mr-2">Zoom:</span>
          {(["day", "week", "month"] as ZoomLevel[]).map((z) => (
            <Button
              key={z}
              variant={zoom === z ? "default" : "outline"}
              size="sm"
              onClick={() => setZoom(z)}
            >
              {z.charAt(0).toUpperCase() + z.slice(1)}
            </Button>
          ))}
          <span className="ml-auto text-xs text-muted-foreground">
            {tasksWithDates.length} of {tasks.length} tasks with dates
          </span>
        </div>

        {/* Chart body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <GanttSidebar
            tasks={tasksWithDates}
            rowHeight={ROW_HEIGHT}
            onTaskClick={(t) => {
              setSelectedTask(t);
              setEditDialogOpen(true);
            }}
          />

          {/* Timeline */}
          <div className="flex-1 overflow-auto" ref={scrollRef}>
            <div style={{ width: timelineWidth, minHeight: "100%" }}>
              <GanttHeader startDate={timelineStart} endDate={timelineEnd} zoom={zoom} dayWidth={dayWidth} />

              <div className="relative">
                {/* Dependency arrows */}
                {arrows.length > 0 && (
                  <svg
                    className="absolute top-0 left-0 pointer-events-none z-5"
                    style={{ width: timelineWidth, height: tasksWithDates.length * ROW_HEIGHT }}
                  >
                    <defs>
                      <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                        <polygon points="0 0, 8 3, 0 6" className="fill-muted-foreground" />
                      </marker>
                    </defs>
                    {arrows.map((a) => {
                      const midX = (a.x1 + a.x2) / 2;
                      return (
                        <path
                          key={a.id}
                          d={`M ${a.x1} ${a.y1} C ${midX} ${a.y1}, ${midX} ${a.y2}, ${a.x2} ${a.y2}`}
                          className="stroke-muted-foreground"
                          strokeWidth={1.5}
                          fill="none"
                          markerEnd="url(#arrowhead)"
                        />
                      );
                    })}
                  </svg>
                )}

                {/* Today line */}
                {todayOffset >= 0 && todayOffset <= timelineWidth && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                    style={{ left: todayOffset }}
                  />
                )}

                {/* Row backgrounds */}
                {tasksWithDates.map((task) => (
                  <div
                    key={task.id}
                    className="relative border-b"
                    style={{ height: ROW_HEIGHT }}
                  >
                    <GanttBar
                      task={task}
                      timelineStart={timelineStart}
                      dayWidth={dayWidth}
                      onClick={() => {
                        setSelectedTask(task);
                        setEditDialogOpen(true);
                      }}
                      onDragEnd={(newStart, newEnd) => {
                        handleDragEnd(task.id, newStart, newEnd);
                      }}
                      onResizeEnd={(newEnd) => {
                        onUpdateTask(task.id, { end_date: newEnd });
                      }}
                    />
                  </div>
                ))}

                {tasksWithDates.length === 0 && (
                  <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                    No tasks with dates. Add start/end dates to tasks to see them here.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

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
    </TooltipProvider>
  );
}
