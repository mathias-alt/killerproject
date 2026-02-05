"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types/database";

export function useProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  const fetchProfiles = useCallback(async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("full_name", { ascending: true });
    setProfiles(data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  return { profiles, loading, refetch: fetchProfiles };
}
