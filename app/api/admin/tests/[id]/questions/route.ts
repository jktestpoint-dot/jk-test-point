import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseConfig } from "@/lib/supabase";

async function serviceRequest(path: string, init: RequestInit = {}) {
  const { url } = getSupabaseConfig();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error("Mock question deletion is not configured on the server.");

  return fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Accept-Profile": "public",
      "Content-Profile": "public",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });

  const testId = params.id?.trim();
  if (!testId || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(testId)) {
    return NextResponse.json({ error: "A valid mock test ID is required." }, { status: 400 });
  }

  const body = await request.json().catch(() => null) as { expectedCount?: unknown } | null;
  if (!body || !Number.isSafeInteger(body.expectedCount) || (body.expectedCount as number) < 0) {
    return NextResponse.json({ error: "Confirm the displayed question count before deleting." }, { status: 400 });
  }

  try {
    const testParams = new URLSearchParams({ select: "id", id: `eq.${testId}`, published: "eq.true", limit: "1" });
    const testResponse = await serviceRequest(`MOCK_TESTS?${testParams.toString()}`);
    if (!testResponse.ok) return NextResponse.json({ error: "Unable to verify the published mock test." }, { status: 502 });
    const tests = await testResponse.json() as Array<{ id: string }>;
    if (!tests.length) return NextResponse.json({ error: "Published mock test not found." }, { status: 404 });

    const questionParams = new URLSearchParams({ select: "id", test_id: `eq.${testId}` });
    const countResponse = await serviceRequest(`TEST_QUESTIONS?${questionParams.toString()}`, {
      method: "HEAD",
      headers: { Prefer: "count=exact", "Range-Unit": "items", Range: "0-0" },
    });
    const countHeader = countResponse.headers.get("content-range");
    const match = countHeader?.match(/\/(\d+)$/);
    if (!countResponse.ok || !match) {
      return NextResponse.json({ error: "Unable to verify the mock question count. No questions were deleted." }, { status: 502 });
    }

    const questionCount = Number(match[1]);
    if (questionCount !== body.expectedCount) {
      return NextResponse.json({ error: "The question count changed. Refresh the mock list and confirm again." }, { status: 409 });
    }
    if (questionCount === 0) return NextResponse.json({ data: { testId, deletedCount: 0 } });

    const deleteParams = new URLSearchParams({ test_id: `eq.${testId}` });
    const deleteResponse = await serviceRequest(`TEST_QUESTIONS?${deleteParams.toString()}`, {
      method: "DELETE",
      headers: { Prefer: "return=minimal" },
    });
    if (!deleteResponse.ok) {
      return NextResponse.json({ error: "Unable to delete questions for this mock test." }, { status: 502 });
    }

    return NextResponse.json({ data: { testId, deletedCount: questionCount } });
  } catch {
    return NextResponse.json({ error: "Mock questions could not be deleted." }, { status: 500 });
  }
}
