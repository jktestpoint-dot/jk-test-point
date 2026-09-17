import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseConfig } from "@/lib/supabase";
import { getFreeSubjectDatabaseKey, getFreeSubjectDefinition } from "@/lib/free-subject-catalog";

const headers = ["question_number", "question", "option_a", "option_b", "option_c", "option_d", "correct_answer", "explanation"] as const;

export async function POST(request: NextRequest) {
  const token = await requireAdmin();
  if (!token) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  const form = await request.formData();
  const action = String(form.get("action") || "import");
  const subjectId = String(form.get("subject") || "");
  const subject = getFreeSubjectDefinition(subjectId);
  if (!subject) return NextResponse.json({ error: "Select an approved Free MCQ subject." }, { status: 400 });
  const { url, key } = getSupabaseConfig();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || key;
  const authHeaders = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Accept-Profile": "public" };
  const dbSubject = getFreeSubjectDatabaseKey(subjectId);
  if (action === "delete") {
    const response = await fetch(`${url}/rest/v1/FREE_MCQ_QUESTIONS?subject=eq.${encodeURIComponent(dbSubject)}`, { method: "DELETE", headers: { ...authHeaders, Prefer: "return=representation" }, cache: "no-store" });
    if (!response.ok) return NextResponse.json({ error: "Unable to delete Free MCQs." }, { status: 502 });
    const rows = await response.json().catch(() => []) as unknown[];
    return NextResponse.json({ data: { deleted: rows.length } });
  }
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Upload a CSV file." }, { status: 400 });
  let raw: Record<string, unknown>[];
  try { const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" }); const sheet = workbook.Sheets[workbook.SheetNames[0]]; raw = sheet ? XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false }) : []; } catch { return NextResponse.json({ error: "The CSV could not be read." }, { status: 400 }); }
  const errors: string[] = []; const seen = new Set<string>();
  const value = (row: Record<string, unknown>, name: string) => String(row[name] ?? "").trim();
  if (!raw.length) errors.push("No question rows found.");
  const first = raw[0] || {}; for (const header of headers) if (!(header in first)) errors.push(`Missing required column: ${header}`);
  const rows = raw.map((row, index) => { const n = value(row, "question_number"); const answer = value(row, "correct_answer").toUpperCase(); if (!/^\d+$/.test(n) || Number(n) < 1) errors.push(`Row ${index + 2}: question_number must be a positive integer.`); if (seen.has(n)) errors.push(`Row ${index + 2}: duplicate question_number ${n}.`); seen.add(n); for (const field of ["question", "option_a", "option_b", "option_c", "option_d", "explanation"]) if (!value(row, field)) errors.push(`Row ${index + 2}: ${field} is required.`); if (!/^[ABCD]$/.test(answer)) errors.push(`Row ${index + 2}: correct_answer must be A, B, C, or D.`); return { question_number: Number(n), question_text: value(row, "question"), option_a: value(row, "option_a"), option_b: value(row, "option_b"), option_c: value(row, "option_c"), option_d: value(row, "option_d"), correct_option: answer, explanation: value(row, "explanation"), subject: dbSubject }; });
  const existingResponse = await fetch(`${url}/rest/v1/FREE_MCQ_QUESTIONS?select=id&subject=eq.${encodeURIComponent(dbSubject)}`, { headers: authHeaders, cache: "no-store" });
  const existing = existingResponse.ok ? await existingResponse.json() as unknown[] : [];
  if (existing.length) errors.push(`${subject.name} already has ${existing.length} Free MCQs. Delete them first before importing.`);
  if (errors.length) return NextResponse.json({ error: "Fix validation errors before importing.", errors }, { status: 400 });
  const response = await fetch(`${url}/rest/v1/FREE_MCQ_QUESTIONS`, { method: "POST", headers: { ...authHeaders, "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify(rows), cache: "no-store" });
  if (!response.ok) return NextResponse.json({ error: "Free MCQ import failed." }, { status: 502 });
  return NextResponse.json({ data: { imported: rows.length } }, { status: 201 });
}
