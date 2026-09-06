import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getMcqPracticeSubject } from "@/lib/mcq-practice";
import { getPublicSubjectQuestions } from "@/lib/subject-mcq";
import { ACCESS_TOKEN_COOKIE, getAuthenticatedStudent } from "@/lib/supabase-auth";
import { hasActiveSubjectEntitlement } from "@/lib/subject-entitlement";

export async function GET(_: Request, { params }: { params: { subject: string } }) {
  if (!getMcqPracticeSubject(params.subject)) return NextResponse.json({ error: "Subject not found." }, { status: 404 });
  try {
    const token = cookies().get(ACCESS_TOKEN_COOKIE)?.value;
    const user = token ? await getAuthenticatedStudent(token) : null;
    if (!token || !user) return NextResponse.json({ error: "Please log in to access this subject." }, { status: 401 });
    if (!await hasActiveSubjectEntitlement(token, params.subject)) return NextResponse.json({ error: "Purchase is required to access this subject." }, { status: 403 });
    const questions = await getPublicSubjectQuestions(params.subject, token);
    return NextResponse.json({ data: questions, complete: questions.length > 0 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load subject questions." }, { status: 503 });
  }
}
