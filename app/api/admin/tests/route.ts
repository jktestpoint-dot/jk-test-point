import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getPublishedCatalogTests } from "@/lib/test-catalog";

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  try {
    return NextResponse.json({ data: await getPublishedCatalogTests() });
  } catch {
    return NextResponse.json({ error: "Unable to load mock tests." }, { status: 503 });
  }
}
