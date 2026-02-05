"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { TaskDependency } from "@/lib/types/database";

export function useDependencies(projectId?: string) {
  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);
  const supabase = useMemo(() => createClient(), []);

  const fetchDependencies = useCallback(async () => {
    try {
      if (!projectId) {
        const { data, error } = await supabase
          .from("task_dependencies")
          .select("*");
        if (error) {
          console.warn("Failed to fetch dependencies:", error.message);
          return;
        }
        setDependencies(data ?? []);
      } else {
        // Fetch all dependencies where either task is in this project
        const { data: taskIds } = await supabase
          .from("tasks")
          .select("id")
          .eq("project_id", projectId);

        if (!taskIds?.length) return;

        const ids = taskIds.map((t) => t.id);
        const { data, error } = await supabase
          .from("task_dependencies")
          .select("*")
          .or(`task_id.in.(${ids.join(",")}),depends_on_id.in.(${ids.join(",")})`);

        if (error) {
          console.warn("Failed to fetch dependencies:", error.message);
          return;
        }
        setDependencies(data ?? []);
      }
    } catch {
      // Table may not exist yet
    }
  }, [supabase, projectId]);

  useEffect(() => {
    fetchDependencies();
  }, [fetchDependencies]);

  async function addDependency(taskId: string, dependsOnId: string) {
    const { data, error } = await supabase
      .from("task_dependencies")
      .insert({ task_id: taskId, depends_on_id: dependsOnId })
      .select()
      .single();
    if (data) setDependencies((prev) => [...prev, data]);
    return { data, error };
  }

  async function removeDependency(id: string) {
    const { error } = await supabase.from("task_dependencies").delete().eq("id", id);
    if (!error) setDependencies((prev) => prev.filter((d) => d.id !== id));
    return { error };
  }

  return { dependencies, addDependency, removeDependency, refetch: fetchDependencies };
}
