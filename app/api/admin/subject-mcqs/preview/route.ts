import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { failedRowCount, parseQuestionFile } from "@/lib/question-import";
import { getMcqPracticeSubject } from "@/lib/mcq-practice";
import { getSupabaseConfig } from "@/lib/supabase";

function subjectErrors(rows: { subject?: string }[], id: string, name: string) {
  const allowed = new Set([id, name.toLowerCase()]);
  return rows.flatMap((row, index) => row.subject && !allowed.has(row.subject.trim().toLowerCase()) ? [`Row ${index + 2}: subject must match ${name}.`] : []);
}

export async function POST(request: NextRequest) {
  const token = await requireAdmin(); if (!token) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  const form = await request.formData(); const subjectId = String(form.get("subject") || ""); const file = form.get("file"); const subject = getMcqPracticeSubject(subjectId);
  if (!subject || !(file instanceof File)) return NextResponse.json({ error: "Select a valid subject and CSV/XLSX file." }, { status: 400 });
  const parsed = await parseQuestionFile(file, { requireMockTest: false }); parsed.errors.push(...subjectErrors(parsed.rows, subject.id, subject.name));
  const { url, key } = getSupabaseConfig(); const response = await fetch(`${url}/rest/v1/SUBJECT_MCQ_QUESTIONS?subject=eq.${encodeURIComponent(subject.id)}&select=question_number`, { headers: { apikey: key, Authorization: `Bearer ${token}`, "Accept-Profile": "public" }, cache: "no-store" });
  if (!response.ok) return NextResponse.json({ error: "Could not verify existing subject questions." }, { status: 502 });
  const existing = await response.json() as unknown[]; if (existing.length) parsed.errors.push(`${subject.name} already contains ${existing.length} question(s). This import will not overwrite existing data.`);
  const failed = failedRowCount(parsed.errors);
  const validRowCount = Math.max(0, parsed.rows.length - failed);
  const canImport = parsed.errors.length === 0 && failed === 0 && existing.length === 0 && validRowCount === parsed.rows.length;
  return NextResponse.json({ data: { rows: parsed.rows, errors: parsed.errors, detected: parsed.rows.length, validRowCount, failedRowCount: failed, existing: existing.length, complete: canImport, canImport } });
}
