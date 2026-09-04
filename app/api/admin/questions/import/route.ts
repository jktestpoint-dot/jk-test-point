import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { parseQuestionFile } from "@/lib/question-import";
import { getPublishedCatalogTest } from "@/lib/test-catalog";
import { getSupabaseConfig } from "@/lib/supabase";

function testMetadataErrors(rows: { mock_test?: string }[], test: { id: string; title: string }) {
  const allowed = new Set([test.id.trim().toLowerCase(), test.title.trim().toLowerCase()]);
  return rows.flatMap((row, index) => row.mock_test && !allowed.has(row.mock_test.trim().toLowerCase()) ? [`Row ${index + 2}: mock_test must match the selected test.`] : []);
}

export async function POST(request: NextRequest) {
  const token = await requireAdmin();
  if (!token) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  const form = await request.formData(); const testId = String(form.get("testId") || ""); const file = form.get("file");
  const test = await getPublishedCatalogTest(testId);
  if (!test || !(file instanceof File)) return NextResponse.json({ error: "Select a valid test and CSV/XLSX file." }, { status: 400 });
  const parsed = await parseQuestionFile(file);
  parsed.errors.push(...testMetadataErrors(parsed.rows, test));
  const { url, key } = getSupabaseConfig();
  const existingResponse = await fetch(`${url}/rest/v1/TEST_QUESTIONS?test_id=eq.${encodeURIComponent(testId)}&select=question_number`, { headers: { apikey: key, Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!existingResponse.ok) return NextResponse.json({ error: "Could not verify existing questions." }, { status: 502 });
  const existing = await existingResponse.json() as { question_number: number }[];
  if (existing.length) parsed.errors.push(`This test already contains ${existing.length} question(s). This import will not overwrite existing data.`);
  if (parsed.errors.length) return NextResponse.json({ error: "Fix validation errors before importing.", errors: parsed.errors, detected: parsed.rows.length }, { status: 400 });
  const response = await fetch(`${url}/rest/v1/rpc/replace_test_questions`, { method: "POST", headers: { apikey: key, Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ p_test_id: testId, p_questions: parsed.rows }), cache: "no-store" });
  const data = await response.json().catch(() => null) as { imported?: number; question_count?: number; duration_minutes?: number; message?: string } | null;
  if (!response.ok) return NextResponse.json({ error: data?.message || "Import failed." }, { status: 400 });
  return NextResponse.json({ data: { imported: data?.imported ?? parsed.rows.length, question_count: data?.question_count ?? parsed.rows.length, duration_minutes: data?.duration_minutes ?? parsed.rows.length, failed: 0 } });
}
