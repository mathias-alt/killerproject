"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { TaskWithAssignee, TaskWithProject } from "@/lib/types/database";

export function useRealtimeTasks(
  projectId: string,
  setTasks: React.Dispatch<React.SetStateAction<TaskWithAssignee[]>>,
  refetch: () => Promise<void>
) {
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel(`tasks:${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, projectId, setTasks, refetch]);
}

export function useRealtimeAllTasks(
  setTasks: React.Dispatch<React.SetStateAction<TaskWithProject[]>>,
  refetch: () => Promise<void>
) {
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel("tasks:all")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, setTasks, refetch]);
}
