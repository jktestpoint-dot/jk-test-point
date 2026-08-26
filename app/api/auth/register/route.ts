import { NextRequest, NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, registerStudent } from "@/lib/supabase-auth";

const cookieOptions = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7 };

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();
    if (!name || !email || !password) return NextResponse.json({ error: "Name, email and password are required." }, { status: 400 });
    const result = await registerStudent(name, email, password);
    const response = NextResponse.json({ requiresEmailConfirmation: !result.access_token });
    if (result.access_token && result.refresh_token) {
      response.cookies.set(ACCESS_TOKEN_COOKIE, result.access_token, cookieOptions);
      response.cookies.set(REFRESH_TOKEN_COOKIE, result.refresh_token, cookieOptions);
    }
    return response;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create your account." }, { status: 400 });
  }
}
