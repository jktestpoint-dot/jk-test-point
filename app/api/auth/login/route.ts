import { NextRequest, NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, signInStudent } from "@/lib/supabase-auth";

const cookieOptions = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7 };

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    const session = await signInStudent(email, password);
    const response = NextResponse.json({ user: session.user });
    response.cookies.set(ACCESS_TOKEN_COOKIE, session.access_token, cookieOptions);
    response.cookies.set(REFRESH_TOKEN_COOKIE, session.refresh_token, cookieOptions);
    return response;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to sign in." }, { status: 401 });
  }
}
