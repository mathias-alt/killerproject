"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Idea, IdeaWithAuthor, IdeaAttachment } from "@/lib/types/database";

export function useIdeas() {
  const [ideas, setIdeas] = useState<IdeaWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  const fetchIdeas = useCallback(async () => {
    const { data, error } = await supabase
      .from("ideas")
      .select("*, author:profiles!ideas_author_id_fkey(*), attachments:idea_attachments(*)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching ideas:", error);
    }
    setIdeas((data as IdeaWithAuthor[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchIdeas();
  }, [fetchIdeas]);

  async function createIdea(title: string, description?: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("ideas")
      .insert({ title, description: description || null, author_id: user.id })
      .select("*, author:profiles!ideas_author_id_fkey(*), attachments:idea_attachments(*)")
      .single();

    if (data) setIdeas((prev) => [data as IdeaWithAuthor, ...prev]);
    return { data, error };
  }

  async function updateIdea(id: string, updates: Partial<Pick<Idea, "title" | "description">>) {
    const { data, error } = await supabase
      .from("ideas")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*, author:profiles!ideas_author_id_fkey(*), attachments:idea_attachments(*)")
      .single();

    if (data) setIdeas((prev) => prev.map((i) => (i.id === id ? (data as IdeaWithAuthor) : i)));
    return { data, error };
  }

  async function deleteIdea(id: string) {
    const { error } = await supabase.from("ideas").delete().eq("id", id);
    if (!error) setIdeas((prev) => prev.filter((i) => i.id !== id));
    return { error };
  }

  async function addAttachment(ideaId: string, file: File) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Upload file to Supabase storage
    const fileExt = file.name.split(".").pop();
    const filePath = `${user.id}/${ideaId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("idea-attachments")
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("idea-attachments")
      .getPublicUrl(filePath);

    // Create attachment record
    const { data, error } = await supabase
      .from("idea_attachments")
      .insert({
        idea_id: ideaId,
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_type: file.type,
        file_size: file.size,
      })
      .select()
      .single();

    if (data) {
      // Refresh ideas to get updated attachments
      await fetchIdeas();
    }

    return { data, error };
  }

  async function deleteAttachment(attachmentId: string) {
    const { error } = await supabase
      .from("idea_attachments")
      .delete()
      .eq("id", attachmentId);

    if (!error) await fetchIdeas();
    return { error };
  }

  return { ideas, loading, createIdea, updateIdea, deleteIdea, addAttachment, deleteAttachment, refetch: fetchIdeas };
}
