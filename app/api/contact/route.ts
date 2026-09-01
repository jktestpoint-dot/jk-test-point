import { NextRequest, NextResponse } from "next/server";

import { getSupabaseConfig } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { name?: unknown; email?: unknown; message?: unknown } | null;
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!name || !email || !message) return NextResponse.json({ error: "Name, email and message are required." }, { status: 400 });
  if (name.length > 120 || email.length > 254 || message.length > 5000) return NextResponse.json({ error: "Your message exceeds the allowed length." }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });

  try {
    const { url, key } = getSupabaseConfig();
    const response = await fetch(`${url}/rest/v1/rpc/submit_contact_message`, { method: "POST", headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Content-Profile": "public" }, body: JSON.stringify({ p_name: name, p_email: email, p_message: message }), cache: "no-store" });
    const data = await response.json().catch(() => null) as { message?: string } | null;
    if (!response.ok) return NextResponse.json({ error: data?.message || "Unable to send your message." }, { status: 502 });
    return NextResponse.json({ data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unable to send your message." }, { status: 502 });
  }
}
