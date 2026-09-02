import { NextRequest, NextResponse } from "next/server";
import { getPublishedCatalogTest } from "@/lib/test-catalog";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const test = await getPublishedCatalogTest(params.id);
    if (!test) return NextResponse.json({ error: "Mock test not found." }, { status: 404 });
    return NextResponse.json({ data: test });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load the mock test.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
