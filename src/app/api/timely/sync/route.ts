import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get Timely tokens
    const { data: tokenData, error: tokenError } = await supabase
      .from("timely_tokens")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json({ error: "Not connected to Timely" }, { status: 400 });
    }

    let accessToken = tokenData.access_token;

    // Check if token is expired and refresh if needed
    if (new Date(tokenData.expires_at) < new Date()) {
      const refreshResponse = await fetch("https://api.timelyapp.com/1.1/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grant_type: "refresh_token",
          client_id: process.env.TIMELY_CLIENT_ID,
          client_secret: process.env.TIMELY_CLIENT_SECRET,
          refresh_token: tokenData.refresh_token,
        }),
      });

      if (!refreshResponse.ok) {
        // Token refresh failed, user needs to reconnect
        await supabase.from("timely_tokens").delete().eq("user_id", user.id);
        return NextResponse.json({ error: "Token expired, please reconnect" }, { status: 401 });
      }

      const refreshData = await refreshResponse.json();
      accessToken = refreshData.access_token;

      // Update stored tokens
      await supabase
        .from("timely_tokens")
        .update({
          access_token: refreshData.access_token,
          refresh_token: refreshData.refresh_token,
          expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);
    }

    // Fetch time entries from Timely (last 30 days by default)
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const sinceStr = since.toISOString().split("T")[0];
    const untilStr = new Date().toISOString().split("T")[0];

    const entriesResponse = await fetch(
      `https://api.timelyapp.com/1.1/${tokenData.account_id}/events?since=${sinceStr}&upto=${untilStr}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!entriesResponse.ok) {
      const errorText = await entriesResponse.text();
      console.error("Timely API error:", errorText);
      return NextResponse.json({ error: "Failed to fetch entries" }, { status: 500 });
    }

    const entries = await entriesResponse.json();

    // Upsert entries into our database
    const entriesToUpsert = entries.map((entry: {
      id: number;
      project?: { name?: string };
      note?: string;
      hours?: number;
      day?: string;
    }) => ({
      timely_id: entry.id,
      user_id: user.id,
      project_name: entry.project?.name || null,
      note: entry.note || null,
      hours: entry.hours || 0,
      date: entry.day,
      updated_at: new Date().toISOString(),
    }));

    if (entriesToUpsert.length > 0) {
      const { error: upsertError } = await supabase
        .from("timely_time_entries")
        .upsert(entriesToUpsert, {
          onConflict: "user_id,timely_id",
          ignoreDuplicates: false,
        });

      if (upsertError) {
        console.error("Upsert error:", upsertError);
        return NextResponse.json({ error: "Failed to store entries" }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      synced: entriesToUpsert.length,
      message: `Synced ${entriesToUpsert.length} time entries`
    });
  } catch (err) {
    console.error("Sync error:", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
