import { NextResponse } from "next/server";
import { getMcqPracticeSubject } from "@/lib/mcq-practice";
import { getPublicSubjectQuestions } from "@/lib/subject-mcq";

export async function GET(_: Request, { params }: { params: { subject: string } }) {
  if (!getMcqPracticeSubject(params.subject)) return NextResponse.json({ error: "Subject not found." }, { status: 404 });
  try {
    const questions = await getPublicSubjectQuestions(params.subject);
    return NextResponse.json({ data: questions, complete: questions.length > 0 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load subject questions." }, { status: 503 });
  }
}
