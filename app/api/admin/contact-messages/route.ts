import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseConfig } from "@/lib/supabase";

export async function GET() {
  const accessToken = await requireAdmin();
  if (!accessToken) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  try {
    const { url, key } = getSupabaseConfig();
    const response = await fetch(`${url}/rest/v1/CONTACT_MESSAGES?select=id,name,email,message,created_at&order=created_at.desc`, { headers: { apikey: key, Authorization: `Bearer ${accessToken}`, "Accept-Profile": "public" }, cache: "no-store" });
    const data = await response.json().catch(() => null) as unknown;
    if (!response.ok) return NextResponse.json({ error: "Unable to load contact messages." }, { status: 502 });
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Unable to load contact messages." }, { status: 502 });
  }
}

export async function DELETE(request: Request) {
  const accessToken = await requireAdmin();
  if (!accessToken) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "A valid message id is required." }, { status: 400 });
  try {
    const { url } = getSupabaseConfig();
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) return NextResponse.json({ error: "Contact message deletion is not configured." }, { status: 503 });
    const response = await fetch(`${url}/rest/v1/CONTACT_MESSAGES?id=eq.${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Accept-Profile": "public", Prefer: "return=minimal" },
      cache: "no-store",
    });
    if (!response.ok) return NextResponse.json({ error: "Unable to delete contact message." }, { status: 502 });
    return NextResponse.json({ data: { deleted: true } });
  } catch {
    return NextResponse.json({ error: "Unable to delete contact message." }, { status: 502 });
  }
}
