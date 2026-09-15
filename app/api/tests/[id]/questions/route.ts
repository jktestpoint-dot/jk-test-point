import { NextRequest, NextResponse } from "next/server";
import { getPublicTestQuestions, getPublishedCatalogTest } from "@/lib/test-catalog";
import { cookies } from "next/headers";
import { ACCESS_TOKEN_COOKIE, getAuthenticatedStudent } from "@/lib/supabase-auth";
import { hasActiveMockEntitlement } from "@/lib/subject-entitlement";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const test = await getPublishedCatalogTest(params.id);
    if (!test) return NextResponse.json({ error: "Mock test not found." }, { status: 404 });
    let token = cookies().get(ACCESS_TOKEN_COOKIE)?.value;
    if (test.price > 0) {
      const user = token ? await getAuthenticatedStudent(token) : null;
      if (!token || !user) return NextResponse.json({ error: "Please log in to access this paid mock test." }, { status: 401 });
      if (!await hasActiveMockEntitlement(token, test.id)) return NextResponse.json({ error: "Purchase is required to access this mock test." }, { status: 403 });
    }
    const questions = await getPublicTestQuestions(test.id, token);
    return NextResponse.json({ data: questions, complete: questions.length > 0 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load test questions." }, { status: 503 });
  }
}
