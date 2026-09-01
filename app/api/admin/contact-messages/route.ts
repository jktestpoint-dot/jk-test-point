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
