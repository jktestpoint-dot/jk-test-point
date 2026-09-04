import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { failedRowCount, parseQuestionFile } from "@/lib/question-import";
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
  if (existing.length) parsed.errors.push(`This test already contains ${existing.length} question(s). Importing will not overwrite existing questions.`);
  const failed = failedRowCount(parsed.errors);
  return NextResponse.json({ data: { rows: parsed.rows, errors: parsed.errors, detected: parsed.rows.length, validRowCount: Math.max(0, parsed.rows.length - failed), failedRowCount: failed, existing: existing.length, complete: !parsed.errors.length } });
}
