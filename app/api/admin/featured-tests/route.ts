import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseConfig } from "@/lib/supabase";

type AdminTest = { id: string; title: string; main_category: string; subcategory: string; featured: boolean };

export async function GET() {
  const token = await requireAdmin();
  if (!token) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });

  const { url, key } = getSupabaseConfig();
  const query = new URLSearchParams({ select: "id,title,main_category,subcategory,featured", published: "eq.true", order: "created_at.desc" });
  const response = await fetch(`${url}/rest/v1/MOCK_TESTS?${query.toString()}`, {
    headers: { apikey: key, Authorization: `Bearer ${token}`, "Accept-Profile": "public" },
    cache: "no-store",
  });
  const data = await response.json().catch(() => null) as AdminTest[] | null;
  if (!response.ok) return NextResponse.json({ error: "Unable to load mock tests." }, { status: 502 });
  return NextResponse.json({ data: Array.isArray(data) ? data : [] });
}

export async function PATCH(request: NextRequest) {
  const token = await requireAdmin();
  if (!token) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });

  const body = await request.json().catch(() => null) as { testId?: unknown; featured?: unknown } | null;
  if (!body || typeof body.testId !== "string" || typeof body.featured !== "boolean") {
    return NextResponse.json({ error: "A test ID and featured value are required." }, { status: 400 });
  }

  const { url, key } = getSupabaseConfig();
  const response = await fetch(`${url}/rest/v1/rpc/set_mock_test_featured`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${token}`, "Content-Type": "application/json", "Content-Profile": "public" },
    body: JSON.stringify({ p_test_id: body.testId, p_featured: body.featured }),
    cache: "no-store",
  });
  const error = await response.json().catch(() => null) as { message?: string } | null;
  if (!response.ok) return NextResponse.json({ error: error?.message || "Unable to update featured status." }, { status: 400 });
  return NextResponse.json({ data: { testId: body.testId, featured: body.featured } });
}
