import { NextRequest, NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, registerStudent } from "@/lib/supabase-auth";

const cookieOptions = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7 };

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, turnstileToken } = await request.json();
    if (typeof turnstileToken !== "string" || !turnstileToken) return NextResponse.json({ error: "Please complete the security check." }, { status: 400 });
    const secret = process.env.TURNSTILE_SECRET_KEY;
    if (!secret) return NextResponse.json({ error: "Please complete the security check." }, { status: 503 });
    const verification = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ secret, response: turnstileToken, ...(request.headers.get("x-forwarded-for") ? { remoteip: request.headers.get("x-forwarded-for")!.split(",")[0].trim() } : {}) }), cache: "no-store" });
    const verificationBody = await verification.json().catch(() => null) as { success?: boolean } | null;
    if (!verification.ok || !verificationBody?.success) return NextResponse.json({ error: "Please complete the security check." }, { status: 400 });
    const normalizedName = typeof name === "string" ? name.trim() : "";
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (!normalizedName || !normalizedEmail || !password) return NextResponse.json({ error: "Name, email and password are required." }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    if (typeof password !== "string" || password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    await registerStudent(normalizedName, normalizedEmail, password);
    return NextResponse.json({ requiresEmailVerification: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create your account." }, { status: 400 });
  }
}
