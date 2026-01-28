"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { TaskDependency } from "@/lib/types/database";

export function useDependencies(projectId?: string) {
  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);
  const supabase = createClient();

  const fetchDependencies = useCallback(async () => {
    if (!projectId) {
      // Fetch all dependencies
      const { data } = await supabase
        .from("task_dependencies")
        .select("*");
      setDependencies(data ?? []);
    } else {
      // Fetch dependencies for tasks in this project
      const { data } = await supabase
        .from("task_dependencies")
        .select("*, task:tasks!task_dependencies_task_id_fkey(project_id)")
        .eq("task.project_id", projectId);
      // Filter nulls from join
      setDependencies((data ?? []).filter((d: any) => d.task) as TaskDependency[]);
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
