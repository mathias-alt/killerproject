import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// This endpoint receives inbound emails from a mail service (e.g. SendGrid, Mailgun, Postmark)
// and creates ideas from them. The email subject becomes the idea title,
// and the body becomes the description.
//
// Setup:
// 1. Set up an email service to forward emails to this webhook
// 2. Set INBOUND_EMAIL_SECRET in your .env for verification
// 3. The sender's email must match a user in the system
//
// For SendGrid Inbound Parse: Configure your domain's MX record and set the webhook URL
// For Mailgun: Set up a route that forwards to this URL
// For Postmark: Configure an inbound stream pointing to this URL

export async function POST(request: NextRequest) {
  try {
    // Verify the webhook secret (passed as query param or header)
    const secret = request.nextUrl.searchParams.get("secret") ??
      request.headers.get("x-webhook-secret");

    const expectedSecret = process.env.INBOUND_EMAIL_SECRET;

    if (!expectedSecret || secret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse the request body - support both JSON and form data
    let senderEmail: string | null = null;
    let subject: string | null = null;
    let body: string | null = null;

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      // JSON format (Postmark, custom)
      const json = await request.json();

      // Postmark sends FromFull.Email as a clean email address
      senderEmail =
        json.FromFull?.Email ||
        json.from ||
        json.From ||
        json.sender ||
        json.envelope?.from;
      subject = json.Subject || json.subject;
      body = json.TextBody || json.text || json.body || json.HtmlBody || json.html || "";

      // Handle nested from field (non-Postmark services)
      if (typeof senderEmail === "object" && senderEmail !== null) {
        senderEmail = (senderEmail as Record<string, string>).email || (senderEmail as Record<string, string>).address;
      }

      // Handle "Name <email>" format in From string
      if (typeof senderEmail === "string" && senderEmail.includes("<")) {
        const emailMatch = senderEmail.match(/<([^>]+)>/);
        if (emailMatch) {
          senderEmail = emailMatch[1];
        }
      }
    } else if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
      // Form data format (SendGrid Inbound Parse)
      const formData = await request.formData();
      senderEmail = formData.get("from")?.toString() || formData.get("sender")?.toString() || null;
      subject = formData.get("subject")?.toString() || null;
      body = formData.get("text")?.toString() || formData.get("html")?.toString() || "";

      // SendGrid sends "from" as "Name <email@example.com>"
      if (senderEmail) {
        const emailMatch = senderEmail.match(/<([^>]+)>/);
        if (emailMatch) {
          senderEmail = emailMatch[1];
        }
      }
    }

    if (!senderEmail) {
      return NextResponse.json({ error: "No sender email found" }, { status: 400 });
    }

    if (!subject) {
      return NextResponse.json({ error: "No subject found" }, { status: 400 });
    }

    // Use service role to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Find user by email
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();

    if (userError) {
      console.error("Error listing users:", userError);
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }

    const user = users.users.find(
      (u) => u.email?.toLowerCase() === senderEmail!.toLowerCase()
    );

    if (!user) {
      console.warn(`Email from unknown user: ${senderEmail}`);
      return NextResponse.json({ error: "Unknown sender" }, { status: 403 });
    }

    // Clean up body text
    let cleanBody = body?.trim() || null;
    if (cleanBody) {
      // Remove HTML tags if present
      cleanBody = cleanBody.replace(/<[^>]*>/g, "").trim();
      // Limit length
      if (cleanBody.length > 5000) {
        cleanBody = cleanBody.substring(0, 5000) + "...";
      }
    }

    // Create the idea
    const { data: idea, error: ideaError } = await supabase
      .from("ideas")
      .insert({
        title: subject.trim(),
        description: cleanBody,
        author_id: user.id,
      })
      .select()
      .single();

    if (ideaError) {
      console.error("Error creating idea:", ideaError);
      return NextResponse.json({ error: "Failed to create idea" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      idea_id: idea.id,
      message: `Idea "${subject}" created from email by ${senderEmail}`
    });
  } catch (err) {
    console.error("Inbound email error:", err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}