"use client";

import { useState, useMemo, useRef } from "react";
import { addDays, subDays, differenceInDays, min, max, startOfDay } from "date-fns";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { GanttHeader, type ZoomLevel } from "./gantt-header";
import { GanttBar } from "./gantt-bar";
import { GanttSidebar } from "./gantt-sidebar";
import { TaskDialog } from "@/components/tasks/task-dialog";
import type { Task, TaskWithAssignee } from "@/lib/types/database";

const ZOOM_CONFIG: Record<ZoomLevel, number> = {
  day: 40,
  week: 20,
  month: 8,
};

const ROW_HEIGHT = 36;

interface GanttChartProps {
  tasks: TaskWithAssignee[];
  onUpdateTask: (id: string, updates: Partial<Task>) => Promise<{ data: unknown; error: unknown }>;
  onDeleteTask: (id: string) => Promise<{ error: unknown }>;
}

export function GanttChart({ tasks, onUpdateTask, onDeleteTask }: GanttChartProps) {
  const [zoom, setZoom] = useState<ZoomLevel>("day");
  const [selectedTask, setSelectedTask] = useState<TaskWithAssignee | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const dayWidth = ZOOM_CONFIG[zoom];

  const tasksWithDates = useMemo(
    () => tasks.filter((t) => t.start_date && t.end_date),
    [tasks]
  );

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

  // Today marker
  const today = startOfDay(new Date());
  const todayOffset = differenceInDays(today, timelineStart) * dayWidth;

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
                {/* Today line */}
                {todayOffset >= 0 && todayOffset <= timelineWidth && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                    style={{ left: todayOffset }}
                  />
                )}

                {/* Row backgrounds */}
                {tasksWithDates.map((task, i) => (
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
                        onUpdateTask(task.id, { start_date: newStart, end_date: newEnd });
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
