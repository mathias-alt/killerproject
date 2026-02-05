import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/dashboard/time-entries?error=${encodeURIComponent(error)}`, request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/dashboard/time-entries?error=no_code", request.url)
    );
  }

  const clientId = process.env.TIMELY_CLIENT_ID;
  const clientSecret = process.env.TIMELY_CLIENT_SECRET;
  const redirectUri = process.env.TIMELY_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.redirect(
      new URL("/dashboard/time-entries?error=missing_config", request.url)
    );
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch("https://api.timelyapp.com/1.1/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Timely token error:", errorData);
      return NextResponse.redirect(
        new URL("/dashboard/time-entries?error=token_exchange_failed", request.url)
      );
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokenData;

    // Get current user from Supabase
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

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.redirect(
        new URL("/dashboard/time-entries?error=not_authenticated", request.url)
      );
    }

    // Get Timely account ID
    const accountsResponse = await fetch("https://api.timelyapp.com/1.1/accounts", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!accountsResponse.ok) {
      return NextResponse.redirect(
        new URL("/dashboard/time-entries?error=account_fetch_failed", request.url)
      );
    }

    const accounts = await accountsResponse.json();
    const accountId = accounts[0]?.id;

    if (!accountId) {
      return NextResponse.redirect(
        new URL("/dashboard/time-entries?error=no_account", request.url)
      );
    }

    // Calculate expiry time
    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    // Store tokens in Supabase (upsert)
    const { error: upsertError } = await supabase
      .from("timely_tokens")
      .upsert({
        user_id: user.id,
        access_token,
        refresh_token,
        expires_at: expiresAt,
        account_id: accountId,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id",
      });

    if (upsertError) {
      console.error("Token storage error:", upsertError);
      return NextResponse.redirect(
        new URL("/dashboard/time-entries?error=storage_failed", request.url)
      );
    }

    return NextResponse.redirect(
      new URL("/dashboard/time-entries?success=connected", request.url)
    );
  } catch (err) {
    console.error("Timely OAuth error:", err);
    return NextResponse.redirect(
      new URL("/dashboard/time-entries?error=unexpected", request.url)
    );
  }
}
