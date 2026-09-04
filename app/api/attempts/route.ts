import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, getAuthenticatedStudent, refreshStudentSession } from "@/lib/supabase-auth";
import { getSupabaseConfig } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const cookieStore = cookies();
  let accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;
  if (!accessToken && !refreshToken) return NextResponse.json({ error: "Please log in to view this result." }, { status: 401 });

  let user = accessToken ? await getAuthenticatedStudent(accessToken) : null;
  let refreshedSession: Awaited<ReturnType<typeof refreshStudentSession>> = null;
  if (!user && refreshToken) {
    refreshedSession = await refreshStudentSession(refreshToken);
    if (refreshedSession) {
      accessToken = refreshedSession.accessToken;
      user = await getAuthenticatedStudent(accessToken);
    }
  }
  if (!user || !accessToken) return NextResponse.json({ error: "Your session has expired. Please log in again." }, { status: 401 });

  const attemptId = request.nextUrl.searchParams.get("attempt");
  const testId = request.nextUrl.searchParams.get("test");
  if (!attemptId && !testId) return NextResponse.json({ error: "Select a submitted test result." }, { status: 400 });

  try {
    const { url, key } = getSupabaseConfig();
    const params = new URLSearchParams({
      select: "id,test_id,test_title,score,percentage,total_marks,answers,review,created_at",
      order: "created_at.desc",
      limit: "1",
    });
    if (attemptId) params.set("id", `eq.${attemptId}`); else params.set("test_id", `eq.${testId}`);
    const response = await fetch(`${url}/rest/v1/TEST_ATTEMPTS?${params.toString()}`, {
      headers: { apikey: key, Authorization: `Bearer ${accessToken}`, "Accept-Profile": "public" },
      cache: "no-store",
    });
    const rows = await response.json().catch(() => null) as unknown;
    if (!response.ok) return NextResponse.json({ error: "Unable to load this submitted result." }, { status: 502 });
    const resultResponse = NextResponse.json({ data: Array.isArray(rows) ? rows[0] ?? null : null });
    if (refreshedSession) {
      const options = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7 };
      resultResponse.cookies.set(ACCESS_TOKEN_COOKIE, refreshedSession.accessToken, options);
      resultResponse.cookies.set(REFRESH_TOKEN_COOKIE, refreshedSession.refreshToken, options);
    }
    return resultResponse;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load this submitted result.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  const cookieStore = cookies();
  let accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;
  if (!accessToken && !refreshToken) return NextResponse.json({ error: "Please log in before submitting a test." }, { status: 401 });
  let user = accessToken ? await getAuthenticatedStudent(accessToken) : null;
  let refreshedSession: Awaited<ReturnType<typeof refreshStudentSession>> = null;

  if (!user && refreshToken) {
    refreshedSession = await refreshStudentSession(refreshToken);
    if (refreshedSession) {
      accessToken = refreshedSession.accessToken;
      user = await getAuthenticatedStudent(accessToken);
    }
  }

  if (!user) return NextResponse.json({ error: "Your session has expired. Please log in again." }, { status: 401 });
  try {
    const { testId, answers } = await request.json();
    if (typeof testId !== "string" || !Array.isArray(answers)) return NextResponse.json({ error: "Invalid test attempt." }, { status: 400 });
    const { url, key } = getSupabaseConfig();
    const response = await fetch(`${url}/rest/v1/rpc/submit_mock_test_attempt`, { method: "POST", headers: { apikey: key, Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", "Content-Profile": "public" }, body: JSON.stringify({ p_test_id: testId, p_answers: answers }), cache: "no-store" });
    const data = await response.json();
    if (!response.ok) return NextResponse.json({ error: data.message || "Unable to submit this test." }, { status: 400 });
    const submissionResponse = NextResponse.json({ data }, { status: 201 });
    if (refreshedSession) {
      const options = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7 };
      submissionResponse.cookies.set(ACCESS_TOKEN_COOKIE, refreshedSession.accessToken, options);
      submissionResponse.cookies.set(REFRESH_TOKEN_COOKIE, refreshedSession.refreshToken, options);
    }
    return submissionResponse;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save your test attempt.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
