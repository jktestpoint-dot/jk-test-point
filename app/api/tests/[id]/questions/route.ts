import { NextRequest, NextResponse } from "next/server";
import { getPublicTestQuestions, getPublishedCatalogTest } from "@/lib/test-catalog";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const test = await getPublishedCatalogTest(params.id);
    if (!test) return NextResponse.json({ error: "Mock test not found." }, { status: 404 });
    const questions = await getPublicTestQuestions(test.id);
    return NextResponse.json({ data: questions, complete: questions.length > 0 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load test questions." }, { status: 503 });
  }
}
