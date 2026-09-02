import { NextResponse } from "next/server";
import { getPublishedCatalogTests } from "@/lib/test-catalog";

export async function GET() {
  try {
    return NextResponse.json({ data: await getPublishedCatalogTests() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load the mock-test catalogue.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
