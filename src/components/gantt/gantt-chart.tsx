"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { addDays, subDays, differenceInDays, min, max, startOfDay, eachDayOfInterval } from "date-fns";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GanttHeader, HEADER_HEIGHT, type ZoomLevel } from "./gantt-header";
import { GanttBar } from "./gantt-bar";
import { GanttSidebar } from "./gantt-sidebar";
import { TaskDialog } from "@/components/tasks/task-dialog";
import { ZoomIn, ZoomOut, ArrowUpDown, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task, TaskPriority, TaskWithAssignee, TaskDependency, Project, Profile } from "@/lib/types/database";
import { TASK_PRIORITY_LABELS } from "@/lib/types/database";

type GanttSortOption = "default" | "project" | "priority";
type GanttFilterState = {
  projectId: string;
  priority: string;
  assigneeId: string;
};

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const ZOOM_CONFIG: Record<ZoomLevel, number> = {
  day: 40,
  week: 20,
  month: 8,
};

const ROW_HEIGHT = 40;

interface GanttChartProps {
  tasks: TaskWithAssignee[];
  projects?: Project[];
  profiles?: Profile[];
  dependencies?: TaskDependency[];
  onUpdateTask: (id: string, updates: Partial<Task>) => Promise<{ data: unknown; error: unknown }>;
  onDeleteTask: (id: string) => Promise<{ error: unknown }>;
  onAddDependency?: (taskId: string, dependsOnId: string) => Promise<{ data: unknown; error: unknown }>;
  onRemoveDependency?: (id: string) => Promise<{ error: unknown }>;
}

export function GanttChart({ tasks, projects, profiles, dependencies = [], onUpdateTask, onDeleteTask, onAddDependency, onRemoveDependency }: GanttChartProps) {
  const [zoom, setZoom] = useState<ZoomLevel>("day");
  const [selectedTask, setSelectedTask] = useState<TaskWithAssignee | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  // Sorting & filtering state
  const [sortBy, setSortBy] = useState<GanttSortOption>("default");
  const [filters, setFilters] = useState<GanttFilterState>({
    projectId: "all",
    priority: "all",
    assigneeId: "all",
  });

  // Dependency drag state
  const [dependencyDrag, setDependencyDrag] = useState<{
    sourceTaskId: string;
    sourceSide: "start" | "end";
    mousePos: { x: number; y: number };
  } | null>(null);

  const dayWidth = ZOOM_CONFIG[zoom];
  const headerHeight = HEADER_HEIGHT[zoom];

  // Filter and sort tasks with dates
  const tasksWithDates = useMemo(() => {
    // First filter tasks that have dates
    let filtered = tasks.filter((t) => t.start_date && t.end_date);

    // Apply filters
    if (filters.projectId !== "all") {
      filtered = filtered.filter((t) => t.project_id === filters.projectId);
    }
    if (filters.priority !== "all") {
      filtered = filtered.filter((t) => t.priority === filters.priority);
    }
    if (filters.assigneeId !== "all") {
      filtered = filtered.filter((t) => t.assignee_id === filters.assigneeId);
    }

    // Apply sorting
    switch (sortBy) {
      case "project":
        return filtered.sort((a, b) => {
          const projA = projects?.find((p) => p.id === a.project_id)?.name ?? "";
          const projB = projects?.find((p) => p.id === b.project_id)?.name ?? "";
          return projA.localeCompare(projB);
        });
      case "priority":
        return filtered.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
      default:
        // Default: sort by start date
        return filtered.sort((a, b) =>
          new Date(a.start_date!).getTime() - new Date(b.start_date!).getTime()
        );
    }
  }, [tasks, filters, sortBy, projects]);

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

  const days = useMemo(() => eachDayOfInterval({ start: timelineStart, end: timelineEnd }), [timelineStart, timelineEnd]);

  // Get all tasks that depend on a given task
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

  // Handle dependency drag start
  const handleDependencyDragStart = useCallback((taskId: string, side: "start" | "end") => {
    if (!onAddDependency) return;
    setDependencyDrag({
      sourceTaskId: taskId,
      sourceSide: side,
      mousePos: { x: 0, y: 0 },
    });
  }, [onAddDependency]);

  // Handle dependency drag end (drop on target)
  const handleDependencyDragEnd = useCallback((targetTaskId: string) => {
    if (!dependencyDrag || !onAddDependency) return;

    const { sourceTaskId, sourceSide } = dependencyDrag;

    // Don't allow self-connections
    if (sourceTaskId === targetTaskId) {
      setDependencyDrag(null);
      return;
    }

    // Check if dependency already exists
    const exists = dependencies.some(
      (d) =>
        (d.depends_on_id === sourceTaskId && d.task_id === targetTaskId) ||
        (d.depends_on_id === targetTaskId && d.task_id === sourceTaskId)
    );

    if (!exists) {
      // If dragging from end of source, source must finish before target starts
      // If dragging from start of source, target must finish before source starts
      if (sourceSide === "end") {
        onAddDependency(targetTaskId, sourceTaskId); // target depends on source
      } else {
        onAddDependency(sourceTaskId, targetTaskId); // source depends on target
      }
    }

    setDependencyDrag(null);
  }, [dependencyDrag, onAddDependency, dependencies]);

  // Track mouse position during drag
  useEffect(() => {
    if (!dependencyDrag) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (chartRef.current) {
        const rect = chartRef.current.getBoundingClientRect();
        setDependencyDrag((prev) =>
          prev
            ? {
                ...prev,
                mousePos: {
                  x: e.clientX - rect.left + (scrollRef.current?.scrollLeft || 0),
                  y: e.clientY - rect.top + (scrollRef.current?.scrollTop || 0),
                },
              }
            : null
        );
      }
    };

    const handleMouseUp = () => {
      setDependencyDrag(null);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dependencyDrag]);

  // Sync vertical scroll between sidebar and timeline
  useEffect(() => {
    const timeline = scrollRef.current;
    const sidebar = sidebarRef.current;
    if (!timeline || !sidebar) return;

    const handleScroll = () => {
      sidebar.scrollTop = timeline.scrollTop;
    };

    timeline.addEventListener("scroll", handleScroll);
    return () => timeline.removeEventListener("scroll", handleScroll);
  }, []);

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

        const midX = x1 + 10;

        return { x1, y1, x2, y2, midX, id: dep.id };
      })
      .filter(Boolean) as { x1: number; y1: number; x2: number; y2: number; midX: number; id: string }[];
  }, [dependencies, taskIndexMap, tasksWithDates, timelineStart, dayWidth]);

  // Compute drag line
  const dragLine = useMemo(() => {
    if (!dependencyDrag) return null;

    const sourceIdx = taskIndexMap.get(dependencyDrag.sourceTaskId);
    if (sourceIdx === undefined) return null;

    const sourceTask = tasksWithDates[sourceIdx];
    if (!sourceTask.start_date || !sourceTask.end_date) return null;

    const sourceStart = differenceInDays(new Date(sourceTask.start_date), timelineStart);
    const sourceEnd = differenceInDays(new Date(sourceTask.end_date), timelineStart) + 1;

    const x1 = dependencyDrag.sourceSide === "end" ? sourceEnd * dayWidth : sourceStart * dayWidth;
    const y1 = sourceIdx * ROW_HEIGHT + ROW_HEIGHT / 2;
    const x2 = dependencyDrag.mousePos.x;
    const y2 = dependencyDrag.mousePos.y - headerHeight;

    return { x1, y1, x2, y2 };
  }, [dependencyDrag, taskIndexMap, tasksWithDates, timelineStart, dayWidth, headerHeight]);

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
      <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card/80 shadow-[0_16px_40px_-30px_oklch(0.22_0.02_258/0.45)] backdrop-blur-sm">
        <div className="flex flex-col gap-2 border-b border-border/70 bg-background/65 px-3 py-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex w-full items-center gap-1 sm:w-auto">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={zoomOut} disabled={zoom === "month"}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <div className="min-w-[60px] px-2 text-center text-sm font-medium">
              {zoom.charAt(0).toUpperCase() + zoom.slice(1)}
            </div>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={zoomIn} disabled={zoom === "day"}>
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>

          <div className="hidden h-6 w-px bg-border sm:block" />

          <div className="flex w-full items-center gap-2 sm:w-auto">
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as GanttSortOption)}>
              <SelectTrigger className="h-8 w-full sm:w-[120px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Start Date</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
                {projects && projects.length > 0 && (
                  <SelectItem value="project">Project</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="hidden h-6 w-px bg-border sm:block" />

          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <Filter className="h-4 w-4 text-muted-foreground" />

            {projects && projects.length > 0 && (
              <Select
                value={filters.projectId}
                onValueChange={(v) => setFilters((f) => ({ ...f, projectId: v }))}
              >
                <SelectTrigger className="h-8 w-full sm:w-[140px]">
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: p.color }}
                        />
                        {p.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select
              value={filters.priority}
              onValueChange={(v) => setFilters((f) => ({ ...f, priority: v }))}
            >
              <SelectTrigger className="h-8 w-full sm:w-[110px]">
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                {(Object.entries(TASK_PRIORITY_LABELS) as [TaskPriority, string][]).map(
                  ([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>

            {profiles && profiles.length > 0 && (
              <Select
                value={filters.assigneeId}
                onValueChange={(v) => setFilters((f) => ({ ...f, assigneeId: v }))}
              >
                <SelectTrigger className="h-8 w-full sm:w-[140px]">
                  <SelectValue placeholder="All Assignees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Assignees</SelectItem>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.full_name ?? "Unknown"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="w-full text-xs text-muted-foreground sm:ml-auto sm:w-auto">
            {dependencyDrag ? (
              <span className="font-medium text-primary">
                Drop on a task to create dependency
              </span>
            ) : (
              <>
                {tasksWithDates.length} of {tasks.filter((t) => t.start_date && t.end_date).length} tasks
                {(filters.projectId !== "all" || filters.priority !== "all" || filters.assigneeId !== "all") && (
                  <span className="text-muted-foreground/70"> (filtered)</span>
                )}
                {onAddDependency && (
                  <span className="ml-2 hidden text-muted-foreground/70 lg:inline">• Drag between task handles to link</span>
                )}
              </>
            )}
          </div>
        </div>

        <div
          className={cn(
            "flex flex-1 overflow-hidden bg-[linear-gradient(180deg,transparent,oklch(0.9_0.01_252/0.08))]",
            dependencyDrag && "cursor-crosshair"
          )}
        >
          <div
            ref={sidebarRef}
            className="z-10 shrink-0 overflow-x-hidden overflow-y-hidden border-r border-border/70 bg-background/70"
          >
            <GanttSidebar
              tasks={tasksWithDates}
              rowHeight={ROW_HEIGHT}
              headerHeight={headerHeight}
              selectedTaskId={dependencyDrag?.sourceTaskId}
              onTaskClick={(t) => {
                setSelectedTask(t);
                setEditDialogOpen(true);
              }}
            />
          </div>

          <div className="flex-1 overflow-auto" ref={scrollRef}>
            <div ref={chartRef} style={{ width: timelineWidth, minHeight: "100%" }}>
              <GanttHeader startDate={timelineStart} endDate={timelineEnd} zoom={zoom} dayWidth={dayWidth} />

              <div className="relative">
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

                <svg
                  className="absolute top-0 left-0 z-[5] pointer-events-none"
                  style={{ width: timelineWidth, height: Math.max(tasksWithDates.length * ROW_HEIGHT, 200) }}
                >
                  <defs>
                    <marker id="arrowhead" markerWidth="6" markerHeight="5" refX="6" refY="2.5" orient="auto">
                      <polygon points="0 0, 6 2.5, 0 5" className="fill-muted-foreground" />
                    </marker>
                    <marker id="arrowhead-drag" markerWidth="6" markerHeight="5" refX="6" refY="2.5" orient="auto">
                      <polygon points="0 0, 6 2.5, 0 5" className="fill-primary" />
                    </marker>
                  </defs>

                  {arrows.map((a) => {
                    const path = a.y1 === a.y2
                      ? `M ${a.x1} ${a.y1} L ${a.x2} ${a.y2}`
                      : `M ${a.x1} ${a.y1} L ${a.midX} ${a.y1} L ${a.midX} ${a.y2} L ${a.x2} ${a.y2}`;

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

                  {dragLine && (
                    <path
                      d={`M ${dragLine.x1} ${dragLine.y1} L ${dragLine.x2} ${dragLine.y2}`}
                      className="stroke-primary"
                      strokeWidth={2}
                      strokeDasharray="5,5"
                      fill="none"
                      markerEnd="url(#arrowhead-drag)"
                    />
                  )}
                </svg>

                {todayOffset >= 0 && todayOffset <= timelineWidth && (
                  <div
                    className="absolute top-0 w-0.5 bg-red-500 z-10"
                    style={{ left: todayOffset, height: tasksWithDates.length * ROW_HEIGHT || 200 }}
                  />
                )}

                {tasksWithDates.map((task, index) => (
                  <div
                    key={task.id}
                    className={cn(
                      "relative border-b",
                      index % 2 === 0 ? "bg-background/70" : "bg-muted/20",
                      dependencyDrag?.sourceTaskId === task.id && "bg-primary/10"
                    )}
                    style={{ height: ROW_HEIGHT }}
                  >
                    <GanttBar
                      task={task}
                      timelineStart={timelineStart}
                      dayWidth={dayWidth}
                      rowHeight={ROW_HEIGHT}
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
                      onDependencyDragStart={onAddDependency ? handleDependencyDragStart : undefined}
                      onDependencyDragEnd={onAddDependency ? handleDependencyDragEnd : undefined}
                      isDependencyDragging={!!dependencyDrag}
                      isValidDropTarget={dependencyDrag ? dependencyDrag.sourceTaskId !== task.id : false}
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
