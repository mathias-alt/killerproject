"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Task, TaskStatus, TaskWithProject } from "@/lib/types/database";

export function useAllTasks() {
  const [tasks, setTasks] = useState<TaskWithProject[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchTasks = useCallback(async () => {
    const { data } = await supabase
      .from("tasks")
      .select("*, assignee:profiles!tasks_assignee_id_fkey(*), project:projects!tasks_project_id_fkey(*)")
      .order("order", { ascending: true });
    setTasks((data as TaskWithProject[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  async function createTask(task: Partial<Task> & { title: string }) {
    const maxOrder = tasks.filter((t) => t.status === task.status).length;
    const { data, error } = await supabase
      .from("tasks")
      .insert({ ...task, order: maxOrder })
      .select("*, assignee:profiles!tasks_assignee_id_fkey(*), project:projects!tasks_project_id_fkey(*)")
      .single();

    if (data) setTasks((prev) => [...prev, data as TaskWithProject]);
    return { data, error };
  }

  async function updateTask(id: string, updates: Partial<Task>) {
    const { data, error } = await supabase
      .from("tasks")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*, assignee:profiles!tasks_assignee_id_fkey(*), project:projects!tasks_project_id_fkey(*)")
      .single();

    if (data) setTasks((prev) => prev.map((t) => (t.id === id ? (data as TaskWithProject) : t)));
    return { data, error };
  }

  async function deleteTask(id: string) {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (!error) setTasks((prev) => prev.filter((t) => t.id !== id));
    return { error };
  }

  async function moveTask(id: string, newStatus: TaskStatus, newOrder: number) {
    return updateTask(id, { status: newStatus, order: newOrder });
  }

  return { tasks, setTasks, loading, createTask, updateTask, deleteTask, moveTask, refetch: fetchTasks };
}
