import { NextRequest, NextResponse } from "next/server";
import { getSupabaseConfig } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const { email } = await request.json();
  if (typeof email !== "string" || !/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  const { url, key } = getSupabaseConfig();
  const redirectTo = new URL("/reset-password", request.url).toString();
  const response = await fetch(`${url}/auth/v1/recover`, { method: "POST", headers: { apikey: key, "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim().toLowerCase(), redirect_to: redirectTo }) });
  if (!response.ok) return NextResponse.json({ error: "Unable to request a password reset." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
