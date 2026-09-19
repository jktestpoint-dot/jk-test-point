import { NextRequest, NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, signInStudent } from "@/lib/supabase-auth";

const cookieOptions = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7 };

export async function POST(request: NextRequest) {
  try {
    const { email, password, turnstileToken } = await request.json();
    if (!email || !password) return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    if (typeof turnstileToken !== "string" || !turnstileToken) return NextResponse.json({ error: "Please complete the security check." }, { status: 400 });
    const secret = process.env.TURNSTILE_SECRET_KEY;
    if (!secret) return NextResponse.json({ error: "Please complete the security check." }, { status: 503 });
    const verification = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ secret, response: turnstileToken, ...(request.headers.get("x-forwarded-for") ? { remoteip: request.headers.get("x-forwarded-for")!.split(",")[0].trim() } : {}) }), cache: "no-store" });
    const verificationBody = await verification.json().catch(() => null) as { success?: boolean } | null;
    if (!verification.ok || !verificationBody?.success) return NextResponse.json({ error: "Please complete the security check." }, { status: 400 });
    const session = await signInStudent(email, password);
    const response = NextResponse.json(session);
    response.cookies.set(ACCESS_TOKEN_COOKIE, session.access_token, cookieOptions);
    response.cookies.set(REFRESH_TOKEN_COOKIE, session.refresh_token, cookieOptions);
    return response;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error && error.message === "Invalid email or password." ? "Invalid email or password. Please try again." : error instanceof Error ? error.message : "Unable to sign in." }, { status: 401 });
  }
}
