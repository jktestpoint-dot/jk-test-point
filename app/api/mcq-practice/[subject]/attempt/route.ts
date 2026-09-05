import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, getAuthenticatedStudent, refreshStudentSession } from "@/lib/supabase-auth";
import { getSupabaseConfig } from "@/lib/supabase";
import { getMcqPracticeSubject } from "@/lib/mcq-practice";

async function session() {
  const store = cookies();
  let token = store.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = store.get(REFRESH_TOKEN_COOKIE)?.value;
  let user = token ? await getAuthenticatedStudent(token) : null;
  let refreshed = null as Awaited<ReturnType<typeof refreshStudentSession>>;
  if (!user && refreshToken) { refreshed = await refreshStudentSession(refreshToken); if (refreshed) { token = refreshed.accessToken; user = await getAuthenticatedStudent(token); } }
  return { token, user, refreshed };
}

function withRefreshedSession(response: NextResponse, refreshed: Awaited<ReturnType<typeof refreshStudentSession>>) {
  if (!refreshed) return response;
  const options = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7 };
  response.cookies.set(ACCESS_TOKEN_COOKIE, refreshed.accessToken, options);
  response.cookies.set(REFRESH_TOKEN_COOKIE, refreshed.refreshToken, options);
  return response;
}

export async function GET(request: NextRequest, { params }: { params: { subject: string } }) {
  if (!getMcqPracticeSubject(params.subject)) return NextResponse.json({ error: "Subject not found." }, { status: 404 });
  const { token, user, refreshed } = await session();
  if (!token || !user) return NextResponse.json({ error: "Please log in to view this result." }, { status: 401 });
  const attemptId = request.nextUrl.searchParams.get("attempt");
  if (!attemptId) return NextResponse.json({ error: "Select a submitted practice result." }, { status: 400 });
  try {
    const { url, key } = getSupabaseConfig();
    const query = new URLSearchParams({ select: "id,subject,score,percentage,total_questions,correct,incorrect,unattempted,review,created_at", id: `eq.${attemptId}`, subject: `eq.${params.subject}`, limit: "1" });
    const response = await fetch(`${url}/rest/v1/SUBJECT_MCQ_ATTEMPTS?${query.toString()}`, { headers: { apikey: key, Authorization: `Bearer ${token}`, "Accept-Profile": "public" }, cache: "no-store" });
    const rows = await response.json().catch(() => null) as unknown;
    if (!response.ok) return NextResponse.json({ error: "Unable to load this practice result." }, { status: 502 });
    return withRefreshedSession(NextResponse.json({ data: Array.isArray(rows) ? rows[0] ?? null : null }), refreshed);
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load this practice result." }, { status: 502 }); }
}

export async function POST(request: NextRequest, { params }: { params: { subject: string } }) {
  if (!getMcqPracticeSubject(params.subject)) return NextResponse.json({ error: "Subject not found." }, { status: 404 });
  const { token, user, refreshed } = await session();
  if (!token || !user) return NextResponse.json({ error: "Please log in before submitting practice." }, { status: 401 });
  try {
    const { answers } = await request.json() as { answers?: unknown };
    if (!Array.isArray(answers)) return NextResponse.json({ error: "Invalid practice attempt." }, { status: 400 });
    const { url, key } = getSupabaseConfig();
    const response = await fetch(`${url}/rest/v1/rpc/submit_subject_mcq_attempt`, { method: "POST", headers: { apikey: key, Authorization: `Bearer ${token}`, "Content-Type": "application/json", "Content-Profile": "public" }, body: JSON.stringify({ p_subject: params.subject, p_answers: answers }), cache: "no-store" });
    const data = await response.json().catch(() => null) as { message?: string } | null;
    if (!response.ok) return NextResponse.json({ error: data?.message || "Unable to submit practice." }, { status: 400 });
    return withRefreshedSession(NextResponse.json({ data }, { status: 201 }), refreshed);
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to submit practice." }, { status: 502 }); }
}
