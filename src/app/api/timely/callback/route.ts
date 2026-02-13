import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const OAUTH_STATE_COOKIE = "timely_oauth_state";

function isSafeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const state = searchParams.get("state");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get(OAUTH_STATE_COOKIE)?.value ?? null;

  cookieStore.delete(OAUTH_STATE_COOKIE);

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

  if (!state || !expectedState || !isSafeEqual(state, expectedState)) {
    return NextResponse.redirect(
      new URL("/dashboard/time-entries?error=invalid_state", request.url)
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

    if (!access_token || !refresh_token || typeof expires_in !== "number") {
      return NextResponse.redirect(
        new URL("/dashboard/time-entries?error=invalid_token_payload", request.url)
      );
    }

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

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.redirect(
        new URL("/dashboard/time-entries?error=not_authenticated", request.url)
      );
    }

    const accountsResponse = await fetch("https://api.timelyapp.com/1.1/accounts", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!accountsResponse.ok) {
      return NextResponse.redirect(
        new URL("/dashboard/time-entries?error=account_fetch_failed", request.url)
      );
    }

    const accounts = await accountsResponse.json();
    const accountId = Array.isArray(accounts) ? accounts[0]?.id : null;

    if (!accountId) {
      return NextResponse.redirect(
        new URL("/dashboard/time-entries?error=no_account", request.url)
      );
    }

    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    const { error: upsertError } = await supabase
      .from("timely_tokens")
      .upsert(
        {
          user_id: user.id,
          access_token,
          refresh_token,
          expires_at: expiresAt,
          account_id: accountId,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      );

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
