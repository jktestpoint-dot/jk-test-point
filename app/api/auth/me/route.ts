import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ACCESS_TOKEN_COOKIE, getAuthenticatedStudent } from "@/lib/supabase-auth";

export async function GET() {
  const token = cookies().get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) return NextResponse.json({ user: null }, { status: 401 });
  const user = await getAuthenticatedStudent(token);
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({ user });
}
