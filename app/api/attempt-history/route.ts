import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  getAuthenticatedStudent,
  refreshStudentSession,
} from "@/lib/supabase-auth";
import { getUnifiedAttemptHistory } from "@/lib/attempt-history";

export async function GET() {
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
    return NextResponse.json({ error: "Please log in to view your attempt history." }, { status: 401 });
  }

  try {
    const attempts = await getUnifiedAttemptHistory(accessToken, user.id);
    const response = NextResponse.json({ data: attempts });
    if (refreshed) {
      const options = {
        httpOnly: true,
        sameSite: "lax" as const,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      };
      response.cookies.set(ACCESS_TOKEN_COOKIE, refreshed.accessToken, options);
      response.cookies.set(REFRESH_TOKEN_COOKIE, refreshed.refreshToken, options);
    }
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load your attempt history.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
