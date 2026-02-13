import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const MAX_REQUEST_BYTES = 1_000_000;
const MAX_SUBJECT_LENGTH = 180;
const MAX_BODY_LENGTH = 5_000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;
const USER_CACHE_TTL_MS = 5 * 60_000;

const requestWindowByIp = new Map<string, { count: number; resetAt: number }>();
const knownUserCache = new Map<string, { id: string; expiresAt: number }>();

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function isRateLimited(ip: string) {
  const now = Date.now();
  const state = requestWindowByIp.get(ip);

  if (!state || now > state.resetAt) {
    requestWindowByIp.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  state.count += 1;
  requestWindowByIp.set(ip, state);
  return state.count > RATE_LIMIT_MAX;
}

function getRequestIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip") || "unknown";
}

function sanitizeText(input: string, maxLength: number) {
  return input
    .replace(/[^\S\r\n]+/g, " ")
    .replace(/\u0000/g, "")
    .trim()
    .slice(0, maxLength);
}

function stripHtml(input: string) {
  return input.replace(/<[^>]*>/g, "");
}

function normalizeEmail(input: unknown) {
  if (typeof input !== "string") {
    return null;
  }

  let value = input.trim();
  if (!value) {
    return null;
  }

  const bracketMatch = value.match(/<([^>]+)>/);
  if (bracketMatch?.[1]) {
    value = bracketMatch[1];
  }

  value = value.toLowerCase();
  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  return isValid ? value : null;
}

async function findUserIdByEmail(
  supabase: {
    auth: {
      admin: {
        listUsers: (params: {
          page: number;
          perPage: number;
        }) => Promise<{
          data: { users: Array<{ id: string; email?: string | null }> };
          error: unknown;
        }>;
      };
    };
  },
  email: string
) {
  const cached = knownUserCache.get(email);
  const now = Date.now();

  if (cached && cached.expiresAt > now) {
    return cached.id;
  }

  let page = 1;
  const perPage = 200;

  while (page <= 20) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });

    if (error) {
      throw error;
    }

    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === email);
    if (user?.id) {
      knownUserCache.set(email, { id: user.id, expiresAt: now + USER_CACHE_TTL_MS });
      return user.id;
    }

    if (data.users.length < perPage) {
      break;
    }

    page += 1;
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const contentLength = Number(request.headers.get("content-length") || "0");
    if (contentLength > MAX_REQUEST_BYTES) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }

    const requestIp = getRequestIp(request);
    if (isRateLimited(requestIp)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const expectedSecret = process.env.INBOUND_EMAIL_SECRET;
    const providedSecret =
      request.headers.get("x-webhook-secret") ?? request.nextUrl.searchParams.get("secret");

    if (!expectedSecret || !providedSecret || !safeEqual(providedSecret, expectedSecret)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }

    let senderEmail: string | null = null;
    let subject: string | null = null;
    let body: string | null = null;

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const json = await request.json();
      const fromCandidate =
        json.FromFull?.Email ||
        json.from ||
        json.From ||
        json.sender ||
        json.envelope?.from ||
        (typeof json.from === "object" ? json.from?.email || json.from?.address : null);

      const textBodyCandidate =
        json.TextBody || json.text || json.body || json.HtmlBody || json.html || "";

      senderEmail = normalizeEmail(fromCandidate);
      subject = sanitizeText(String(json.Subject || json.subject || ""), MAX_SUBJECT_LENGTH) || null;
      body = sanitizeText(stripHtml(String(textBodyCandidate || "")), MAX_BODY_LENGTH) || null;
    } else if (
      contentType.includes("multipart/form-data") ||
      contentType.includes("application/x-www-form-urlencoded")
    ) {
      const formData = await request.formData();
      senderEmail = normalizeEmail(
        formData.get("from")?.toString() || formData.get("sender")?.toString() || ""
      );
      subject =
        sanitizeText(formData.get("subject")?.toString() || "", MAX_SUBJECT_LENGTH) || null;
      body = sanitizeText(
        stripHtml(formData.get("text")?.toString() || formData.get("html")?.toString() || ""),
        MAX_BODY_LENGTH
      ) || null;
    } else {
      return NextResponse.json({ error: "Unsupported content type" }, { status: 415 });
    }

    if (!senderEmail) {
      return NextResponse.json({ error: "No sender email found" }, { status: 400 });
    }

    if (!subject) {
      return NextResponse.json({ error: "No valid subject found" }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const userId = await findUserIdByEmail(supabase, senderEmail);

    if (!userId) {
      return NextResponse.json({ error: "Unknown sender" }, { status: 403 });
    }

    const { data: idea, error: ideaError } = await supabase
      .from("ideas")
      .insert({
        title: subject,
        description: body,
        author_id: userId,
      })
      .select("id")
      .single();

    if (ideaError || !idea) {
      console.error("Error creating idea from inbound email:", ideaError);
      return NextResponse.json({ error: "Failed to create idea" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      idea_id: idea.id,
      message: "Idea created from inbound email",
    });
  } catch (error) {
    console.error("Inbound email processing failed:", error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
