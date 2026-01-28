"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { addDays, subDays, differenceInDays, min, max, startOfDay, eachDayOfInterval } from "date-fns";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { GanttHeader, HEADER_HEIGHT, type ZoomLevel } from "./gantt-header";
import { GanttBar } from "./gantt-bar";
import { GanttSidebar } from "./gantt-sidebar";
import { TaskDialog } from "@/components/tasks/task-dialog";
import { Link2, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task, TaskWithAssignee, TaskDependency } from "@/lib/types/database";

const ZOOM_CONFIG: Record<ZoomLevel, number> = {
  day: 40,
  week: 20,
  month: 8,
};

const ROW_HEIGHT = 40;

interface GanttChartProps {
  tasks: TaskWithAssignee[];
  dependencies?: TaskDependency[];
  onUpdateTask: (id: string, updates: Partial<Task>) => Promise<{ data: unknown; error: unknown }>;
  onDeleteTask: (id: string) => Promise<{ error: unknown }>;
  onAddDependency?: (taskId: string, dependsOnId: string) => Promise<{ data: unknown; error: unknown }>;
  onRemoveDependency?: (id: string) => Promise<{ error: unknown }>;
}

export function GanttChart({ tasks, dependencies = [], onUpdateTask, onDeleteTask, onAddDependency, onRemoveDependency }: GanttChartProps) {
  const [zoom, setZoom] = useState<ZoomLevel>("day");
  const [selectedTask, setSelectedTask] = useState<TaskWithAssignee | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Link mode state
  const [linkMode, setLinkMode] = useState(false);
  const [linkSource, setLinkSource] = useState<string | null>(null);

  const dayWidth = ZOOM_CONFIG[zoom];
  const headerHeight = HEADER_HEIGHT[zoom];

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

  // Get weekend columns for shading
  const days = useMemo(() => eachDayOfInterval({ start: timelineStart, end: timelineEnd }), [timelineStart, timelineEnd]);

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

    await onUpdateTask(taskId, { start_date: newStart, end_date: newEnd });

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

  // Handle bar click in link mode
  const handleBarClick = useCallback((task: TaskWithAssignee) => {
    if (!linkMode || !onAddDependency) {
      setSelectedTask(task);
      setEditDialogOpen(true);
      return;
    }

    if (!linkSource) {
      setLinkSource(task.id);
    } else {
      if (task.id !== linkSource) {
        const exists = dependencies.some(
          (d) => d.depends_on_id === linkSource && d.task_id === task.id
        );
        if (!exists) {
          onAddDependency(task.id, linkSource);
        }
      }
      setLinkSource(null);
      setLinkMode(false);
    }
  }, [linkMode, linkSource, onAddDependency, dependencies]);

  // Compute dependency arrows with right-angle routing
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

        // Right-angle path: horizontal from source, then vertical, then horizontal to target
        const midX = x1 + 10; // Small horizontal offset from source

        return { x1, y1, x2, y2, midX, id: dep.id };
      })
      .filter(Boolean) as { x1: number; y1: number; x2: number; y2: number; midX: number; id: string }[];
  }, [dependencies, taskIndexMap, tasksWithDates, timelineStart, dayWidth]);

  const linkSourceTask = linkSource ? tasksWithDates.find((t) => t.id === linkSource) : null;

  const zoomIn = () => {
    if (zoom === "month") setZoom("week");
    else if (zoom === "week") setZoom("day");
  };

  const zoomOut = () => {
    if (zoom === "day") setZoom("week");
    else if (zoom === "week") setZoom("month");
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full bg-background">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={zoomOut} disabled={zoom === "month"}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <div className="px-2 text-sm font-medium min-w-[60px] text-center">
              {zoom.charAt(0).toUpperCase() + zoom.slice(1)}
            </div>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={zoomIn} disabled={zoom === "day"}>
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>

          <div className="h-6 w-px bg-border mx-2" />

          {onAddDependency && (
            <Button
              variant={linkMode ? "default" : "outline"}
              size="sm"
              className="h-8"
              onClick={() => {
                setLinkMode(!linkMode);
                setLinkSource(null);
              }}
            >
              <Link2 className="h-4 w-4 mr-1.5" />
              {linkMode ? "Cancel" : "Link Tasks"}
            </Button>
          )}

          <span className="ml-auto text-xs text-muted-foreground">
            {linkMode ? (
              linkSource ? (
                <span className="text-primary font-medium">
                  Click the dependent task (depends on &quot;{linkSourceTask?.title}&quot;)
                </span>
              ) : (
                <span className="text-primary font-medium">
                  Click the task that must finish first
                </span>
              )
            ) : (
              `${tasksWithDates.length} of ${tasks.length} tasks with dates`
            )}
          </span>
        </div>

        {/* Chart body */}
        <div className={cn("flex flex-1 overflow-hidden", linkMode && "cursor-crosshair")}>
          {/* Sidebar */}
          <GanttSidebar
            tasks={tasksWithDates}
            rowHeight={ROW_HEIGHT}
            headerHeight={headerHeight}
            selectedTaskId={linkSource}
            onTaskClick={(t) => {
              if (linkMode) {
                handleBarClick(t);
              } else {
                setSelectedTask(t);
                setEditDialogOpen(true);
              }
            }}
          />

          {/* Timeline */}
          <div className="flex-1 overflow-auto" ref={scrollRef}>
            <div style={{ width: timelineWidth, minHeight: "100%" }}>
              <GanttHeader startDate={timelineStart} endDate={timelineEnd} zoom={zoom} dayWidth={dayWidth} />

              <div className="relative">
                {/* Weekend shading columns */}
                {zoom === "day" && days.map((day, i) => {
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                  if (!isWeekend) return null;
                  return (
                    <div
                      key={day.toISOString()}
                      className="absolute top-0 bottom-0 bg-muted/30"
                      style={{ left: i * dayWidth, width: dayWidth, height: tasksWithDates.length * ROW_HEIGHT }}
                    />
                  );
                })}

                {/* Dependency arrows */}
                {arrows.length > 0 && (
                  <svg
                    className="absolute top-0 left-0 z-[5] pointer-events-none"
                    style={{ width: timelineWidth, height: tasksWithDates.length * ROW_HEIGHT }}
                  >
                    <defs>
                      <marker id="arrowhead" markerWidth="6" markerHeight="5" refX="6" refY="2.5" orient="auto">
                        <polygon points="0 0, 6 2.5, 0 5" className="fill-muted-foreground" />
                      </marker>
                      <marker id="arrowhead-hover" markerWidth="6" markerHeight="5" refX="6" refY="2.5" orient="auto">
                        <polygon points="0 0, 6 2.5, 0 5" fill="#ef4444" />
                      </marker>
                    </defs>
                    {arrows.map((a) => {
                      // Right-angle path
                      const path = a.y1 === a.y2
                        ? `M ${a.x1} ${a.y1} L ${a.x2} ${a.y2}` // Same row: straight line
                        : `M ${a.x1} ${a.y1} L ${a.midX} ${a.y1} L ${a.midX} ${a.y2} L ${a.x2} ${a.y2}`; // Different rows: right angles

                      return (
                        <g key={a.id} className="group" style={{ pointerEvents: onRemoveDependency ? "auto" : "none" }}>
                          {onRemoveDependency && (
                            <path
                              d={path}
                              strokeWidth={12}
                              fill="none"
                              stroke="transparent"
                              className="cursor-pointer"
                              onClick={() => onRemoveDependency(a.id)}
                            />
                          )}
                          <path
                            d={path}
                            className="stroke-muted-foreground group-hover:stroke-red-500 transition-colors"
                            strokeWidth={1.5}
                            fill="none"
                            markerEnd="url(#arrowhead)"
                          />
                        </g>
                      );
                    })}
                  </svg>
                )}

                {/* Today line */}
                {todayOffset >= 0 && todayOffset <= timelineWidth && (
                  <div
                    className="absolute top-0 w-0.5 bg-red-500 z-10"
                    style={{ left: todayOffset, height: tasksWithDates.length * ROW_HEIGHT || 200 }}
                  />
                )}

                {/* Task rows */}
                {tasksWithDates.map((task, index) => (
                  <div
                    key={task.id}
                    className={cn(
                      "relative border-b",
                      index % 2 === 0 ? "bg-background" : "bg-muted/10",
                      linkMode && linkSource === task.id && "bg-primary/10"
                    )}
                    style={{ height: ROW_HEIGHT }}
                  >
                    <GanttBar
                      task={task}
                      timelineStart={timelineStart}
                      dayWidth={dayWidth}
                      rowHeight={ROW_HEIGHT}
                      onClick={() => handleBarClick(task)}
                      onDragEnd={linkMode ? undefined : (newStart, newEnd) => {
                        handleDragEnd(task.id, newStart, newEnd);
                      }}
                      onResizeEnd={linkMode ? undefined : (newEnd) => {
                        onUpdateTask(task.id, { end_date: newEnd });
                      }}
                    />
                  </div>
                ))}

                {tasksWithDates.length === 0 && (
                  <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
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
