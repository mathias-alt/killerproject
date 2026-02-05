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

    // Delete tokens (this will cascade to entries due to our RLS but keep entries)
    const { error: deleteError } = await supabase
      .from("timely_tokens")
      .delete()
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("Disconnect error:", deleteError);
      return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Disconnect error:", err);
    return NextResponse.json({ error: "Disconnect failed" }, { status: 500 });
  }
}
