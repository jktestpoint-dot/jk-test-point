import { NextRequest, NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, verifyRegistrationOtp } from "@/lib/supabase-auth";

const cookieOptions = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7 };

export async function POST(request: NextRequest) {
  try {
    const { email, token } = await request.json();
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    const code = typeof token === "string" ? token.trim() : "";
    if (!normalizedEmail || !/^\d{6}$/.test(code)) return NextResponse.json({ error: "Enter the 6-digit code sent to your email." }, { status: 400 });
    const session = await verifyRegistrationOtp(normalizedEmail, code);
    const response = NextResponse.json({ user: { id: session.user.id } });
    response.cookies.set(ACCESS_TOKEN_COOKIE, session.access_token, cookieOptions);
    response.cookies.set(REFRESH_TOKEN_COOKIE, session.refresh_token, cookieOptions);
    return response;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to verify your email." }, { status: 400 });
  }
}
