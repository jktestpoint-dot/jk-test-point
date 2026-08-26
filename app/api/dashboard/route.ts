import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ACCESS_TOKEN_COOKIE, getAuthenticatedStudent } from "@/lib/supabase-auth";
import { getStudentAttempts } from "@/lib/supabase";

function currentStreak(dates: string[]) {
  const attempted = new Set(dates.map((date) => new Date(date).toISOString().slice(0, 10)));
  let streak = 0;
  const day = new Date();
  day.setHours(0, 0, 0, 0);
  while (attempted.has(day.toISOString().slice(0, 10))) { streak += 1; day.setDate(day.getDate() - 1); }
  return streak;
}

export async function GET() {
  const accessToken = cookies().get(ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const user = await getAuthenticatedStudent(accessToken);
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  try {
    const attempts = await getStudentAttempts(accessToken, user.id);
    const percentages = attempts.map((attempt) => Number(attempt.percentage));
    const average = percentages.length ? Math.round(percentages.reduce((sum, percentage) => sum + percentage, 0) / percentages.length) : 0;
    const best = percentages.length ? Math.round(Math.max(...percentages)) : 0;
    return NextResponse.json({ user, stats: { testsAttempted: attempts.length, averageScore: average, bestScore: best, currentStreak: currentStreak(attempts.map((attempt) => attempt.created_at)) }, attempts });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load dashboard.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
