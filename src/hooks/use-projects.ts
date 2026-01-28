"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Project } from "@/lib/types/database";

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchProjects = useCallback(async () => {
    const { data } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });
    setProjects(data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  async function createProject(project: Pick<Project, "name" | "description" | "color">) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("projects")
      .insert({ ...project, owner_id: user.id })
      .select()
      .single();

    if (data) setProjects((prev) => [data, ...prev]);
    return { data, error };
  }

  async function updateProject(id: string, updates: Partial<Pick<Project, "name" | "description" | "color">>) {
    const { data, error } = await supabase
      .from("projects")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (data) setProjects((prev) => prev.map((p) => (p.id === id ? data : p)));
    return { data, error };
  }

  async function deleteProject(id: string) {
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (!error) setProjects((prev) => prev.filter((p) => p.id !== id));
    return { error };
  }

  return { projects, loading, createProject, updateProject, deleteProject, refetch: fetchProjects };
}
