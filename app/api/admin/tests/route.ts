import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseConfig } from "@/lib/supabase";
import { getPublishedCatalogTests } from "@/lib/test-catalog";

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  try {
    return NextResponse.json({ data: await getPublishedCatalogTests() });
  } catch {
    return NextResponse.json({ error: "Unable to load mock tests." }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  const testId = request.nextUrl.searchParams.get("id")?.trim();
  if (!testId || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(testId)) {
    return NextResponse.json({ error: "A valid mock test ID is required." }, { status: 400 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return NextResponse.json({ error: "Mock deletion is not configured on the server." }, { status: 503 });
  const { url } = getSupabaseConfig();
  const response = await fetch(`${url}/rest/v1/MOCK_TESTS?id=eq.${encodeURIComponent(testId)}`, {
    method: "DELETE",
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Profile": "public", Prefer: "return=representation" },
    cache: "no-store",
  });
  if (!response.ok) return NextResponse.json({ error: "Unable to delete the mock test." }, { status: 502 });
  const deleted = await response.json().catch(() => []) as unknown;
  return NextResponse.json({ data: { deleted: Array.isArray(deleted) && deleted.length > 0, id: testId } });
}
