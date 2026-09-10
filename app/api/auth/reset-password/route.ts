import { NextRequest, NextResponse } from "next/server";
import { getSupabaseConfig } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const { accessToken, password } = await request.json();
  if (typeof accessToken !== "string" || typeof password !== "string" || password.length < 8) return NextResponse.json({ error: "Choose a password with at least 8 characters." }, { status: 400 });
  const { url, key } = getSupabaseConfig();
  const response = await fetch(`${url}/auth/v1/user`, { method: "PUT", headers: { apikey: key, Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
  if (!response.ok) return NextResponse.json({ error: "This password-reset link is invalid or has expired." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
