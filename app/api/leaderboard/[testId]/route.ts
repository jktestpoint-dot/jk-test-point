import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  getAuthenticatedStudent,
  refreshStudentSession,
} from "@/lib/supabase-auth";
import { getSupabaseConfig } from "@/lib/supabase";

type LeaderboardRow = {
  rank: number;
  display_name: string;
  percentage: number | string;
  score: number;
  test_title: string;
};

function validTestId(value: string) {
  return value.length > 0 && value.length <= 160;
}

function refreshedCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}

export async function GET(
  _request: Request,
  { params }: { params: { testId: string } },
) {
  const testId = params.testId?.trim();
  if (!validTestId(testId || "")) {
    return NextResponse.json({ error: "A valid mock test is required." }, { status: 400 });
  }

  const store = cookies();
  let accessToken = store.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = store.get(REFRESH_TOKEN_COOKIE)?.value;
  let user = accessToken ? await getAuthenticatedStudent(accessToken) : null;
  let refreshed: Awaited<ReturnType<typeof refreshStudentSession>> = null;

  if (!user && refreshToken) {
    refreshed = await refreshStudentSession(refreshToken);
    if (refreshed) {
      accessToken = refreshed.accessToken;
      user = await getAuthenticatedStudent(accessToken);
    }
  }

  if (!user || !accessToken) {
    return NextResponse.json({ error: "Please log in to view the leaderboard." }, { status: 401 });
  }

  try {
    const { url, key } = getSupabaseConfig();
    const response = await fetch(`${url}/rest/v1/rpc/get_test_leaderboard`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Content-Profile": "public",
      },
      body: JSON.stringify({ p_test_id: testId }),
      cache: "no-store",
    });
    const payload = await response.json().catch(() => null) as unknown;
    if (!response.ok) {
      return NextResponse.json({ error: "Unable to load this leaderboard." }, { status: 502 });
    }

    // Re-project the RPC response to make the API contract explicit and ensure
    // that no future database-side field can be exposed accidentally.
    const rows = Array.isArray(payload) ? payload as LeaderboardRow[] : [];
    const data = rows.map((row) => ({
      rank: Number(row.rank),
      displayName: String(row.display_name),
      percentage: Number(row.percentage),
      score: Number(row.score),
      testTitle: String(row.test_title),
    }));

    const result = NextResponse.json({ data });
    if (refreshed) {
      const options = refreshedCookieOptions();
      result.cookies.set(ACCESS_TOKEN_COOKIE, refreshed.accessToken, options);
      result.cookies.set(REFRESH_TOKEN_COOKIE, refreshed.refreshToken, options);
    }
    return result;
  } catch {
    return NextResponse.json({ error: "Unable to load this leaderboard." }, { status: 502 });
  }
}
