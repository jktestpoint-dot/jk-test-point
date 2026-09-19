import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { MAIN_CATEGORIES } from "@/lib/mock-test-types";
import { failedRowCount, parseQuestionFile } from "@/lib/question-import";
import { getSupabaseConfig } from "@/lib/supabase";

const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const difficulties = new Set(["Easy", "Medium", "Hard"]);
type Metadata = { id: string; title: string; mainCategory: string; subcategory: string; description: string; price: number; difficulty: string; totalMarks: number; durationMinutes: number };

function metadataFrom(form: FormData): { value?: Metadata; errors: string[] } {
  const id = String(form.get("id") || "").trim().toLowerCase(); const title = String(form.get("title") || "").trim(); const mainCategory = String(form.get("mainCategory") || "").trim(); const subcategory = String(form.get("subcategory") || "").trim(); const description = String(form.get("description") || "").trim();
  const price = Number(form.get("price")); const difficulty = String(form.get("difficulty") || "").trim(); const totalMarks = Number(form.get("totalMarks")); const durationMinutes = Number(form.get("durationMinutes"));
  const errors: string[] = [];
  if (!idPattern.test(id)) errors.push("Mock ID must use lowercase letters, numbers and hyphens only.");
  if (!title) errors.push("Title is required.");
  if (!(MAIN_CATEGORIES as readonly string[]).includes(mainCategory)) errors.push("Select a valid main category.");
  if (!subcategory) errors.push("Subcategory is required.");
  if (!description) errors.push("Description is required.");
  if (!Number.isInteger(price) || price < 0) errors.push("Price must be a non-negative integer.");
  if (!difficulties.has(difficulty)) errors.push("Select a valid difficulty.");
  if (!Number.isInteger(totalMarks) || totalMarks <= 0) errors.push("Total marks must be a positive integer.");
  if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) errors.push("Duration must be a positive integer.");
  return errors.length ? { errors } : { errors, value: { id, title, mainCategory, subcategory, description, price, difficulty, totalMarks, durationMinutes } };
}

async function supabaseRequest(path: string, init: RequestInit = {}) {
  const { url } = getSupabaseConfig(); const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error("Mock import is not configured on the server.");
  return fetch(`${url}/rest/v1/${path}`, { ...init, headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Profile": "public", "Accept-Profile": "public", "Content-Type": "application/json", ...(init.headers || {}) }, cache: "no-store" });
}

export async function POST(request: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  try {
    const form = await request.formData(); const action = String(form.get("action") || "preview"); const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Upload a CSV or XLSX question file." }, { status: 400 });
    const metadata = metadataFrom(form); if (!metadata.value) return NextResponse.json({ error: "Fix the mock metadata before continuing.", errors: metadata.errors }, { status: 400 });
    const parsed = await parseQuestionFile(file);
    const existingResponse = await supabaseRequest(`MOCK_TESTS?id=eq.${encodeURIComponent(metadata.value.id)}&select=id&limit=1`);
    if (!existingResponse.ok) return NextResponse.json({ error: "Unable to verify whether this mock ID already exists." }, { status: 502 });
    const existing = (await existingResponse.json()) as { id: string }[];
    const errors = [...parsed.errors]; if (existing.length) errors.push("A mock test with this ID already exists. Choose a new ID to prevent duplicate imports.");
    const failed = failedRowCount(errors);
    const data = { detected: parsed.rows.length, validRowCount: Math.max(0, parsed.rows.length - failed), failedRowCount: failed, errors, existing: existing.length > 0, rows: parsed.rows.map((row, index) => ({ ...row, source_row: index + 2 })) };
    if (action === "preview") return NextResponse.json({ data });
    if (action !== "import") return NextResponse.json({ error: "Invalid import action." }, { status: 400 });
    if (errors.length) return NextResponse.json({ error: "Fix validation errors before importing.", errors }, { status: 400 });
    const mockResponse = await supabaseRequest("MOCK_TESTS", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ id: metadata.value.id, title: metadata.value.title, main_category: metadata.value.mainCategory, subcategory: metadata.value.subcategory, description: metadata.value.description, question_count: parsed.rows.length, duration_minutes: metadata.value.durationMinutes, price: metadata.value.price, difficulty: metadata.value.difficulty, total_marks: metadata.value.totalMarks, negative_marking: "None", questions: [], published: true }) });
    if (!mockResponse.ok) return NextResponse.json({ error: "Unable to create the mock test." }, { status: 502 });
    const questionResponse = await supabaseRequest("TEST_QUESTIONS", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(parsed.rows.map((row) => ({ test_id: metadata.value?.id, question_number: Number(row.question_number), question_text: row.question_text, option_a: row.option_a, option_b: row.option_b, option_c: row.option_c, option_d: row.option_d, correct_option: row.correct_option, explanation: row.explanation || null }))) });
    if (!questionResponse.ok) { await supabaseRequest(`MOCK_TESTS?id=eq.${encodeURIComponent(metadata.value.id)}`, { method: "DELETE" }); return NextResponse.json({ error: "Questions could not be imported; the new mock was removed." }, { status: 502 }); }
    return NextResponse.json({ data: { imported: parsed.rows.length, skipped: 0, question_count: parsed.rows.length } });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Mock import failed." }, { status: 500 }); }
}
