import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ACCESS_TOKEN_COOKIE, getAuthenticatedStudent } from "@/lib/supabase-auth";
import { createStudentAttempt } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const accessToken = cookies().get(ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) return NextResponse.json({ error: "Please log in before submitting a test." }, { status: 401 });
  const user = await getAuthenticatedStudent(accessToken);
  if (!user) return NextResponse.json({ error: "Your session has expired. Please log in again." }, { status: 401 });
  try {
    const { testId, testTitle, score, percentage } = await request.json();
    if (typeof score !== "number" || typeof percentage !== "number") return NextResponse.json({ error: "Invalid test attempt." }, { status: 400 });
    const attempt = await createStudentAttempt(accessToken, { user_id: user.id, test_id: testId || null, test_title: testTitle || null, score, percentage });
    return NextResponse.json({ data: attempt }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save your test attempt.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
