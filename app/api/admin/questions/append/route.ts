import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { parseQuestionFile, failedRowCount } from "@/lib/question-import";
import { getSupabaseConfig } from "@/lib/supabase";

type ExistingQuestion = { question_number: number; question_text: string };
type ExistingMock = { id: string; title: string; main_category: string; subcategory: string };

function normalizeQuestion(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/\s+/g, " ").trim();
}

async function serviceRequest(path: string, init: RequestInit = {}) {
  const { url } = getSupabaseConfig();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error("Question append is not configured on the server.");
  return fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Profile": "public",
      "Accept-Profile": "public",
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
}

async function loadExistingQuestions(testId: string) {
  const params = new URLSearchParams({ select: "question_number,question_text", test_id: `eq.${testId}`, order: "question_number.asc", limit: "10000" });
  const response = await serviceRequest(`TEST_QUESTIONS?${params.toString()}`);
  if (!response.ok) throw new Error("Unable to check the selected mock's existing questions.");
  return await response.json() as ExistingQuestion[];
}

async function loadMock(testId: string) {
  const params = new URLSearchParams({ select: "id,title,main_category,subcategory", id: `eq.${testId}`, limit: "1" });
  const response = await serviceRequest(`MOCK_TESTS?${params.toString()}`);
  if (!response.ok) throw new Error("Unable to verify the selected mock.");
  const rows = await response.json() as ExistingMock[];
  return rows[0] ?? null;
}

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  try {
    const params = new URLSearchParams({ select: "id,title,main_category,subcategory,description,question_count,duration_minutes,price,total_marks,negative_marking,featured", order: "created_at.desc", limit: "1000" });
    const response = await serviceRequest(`MOCK_TESTS?${params.toString()}`);
    if (!response.ok) return NextResponse.json({ error: "Unable to load existing mock tests." }, { status: 502 });
    return NextResponse.json({ data: await response.json() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load existing mock tests." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });

  try {
    const form = await request.formData();
    const action = String(form.get("action") || "preview");
    const testId = String(form.get("testId") || "").trim();
    const file = form.get("file");
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(testId)) return NextResponse.json({ error: "Select a valid existing mock test." }, { status: 400 });
    if (!(file instanceof File)) return NextResponse.json({ error: "Upload a CSV or XLSX question file." }, { status: 400 });
    if (action !== "preview" && action !== "append") return NextResponse.json({ error: "Invalid action." }, { status: 400 });

    // Any existing mock is eligible, including unpublished mocks. This route never edits MOCK_TESTS metadata.
    const test = await loadMock(testId);
    if (!test) return NextResponse.json({ error: "The selected mock was not found." }, { status: 404 });

    const parsed = await parseQuestionFile(file, { requireMockTest: false });
    const existing = await loadExistingQuestions(testId);
    const errors = [...parsed.errors];
    const existingTexts = new Set(existing.map((row) => normalizeQuestion(row.question_text)));
    parsed.rows.forEach((row, index) => {
      if (existingTexts.has(normalizeQuestion(row.question_text))) errors.push(`Row ${index + 2}: this question already exists in ${test.title}.`);
      if (row.mock_test && ![test.id.toLowerCase(), test.title.toLowerCase()].includes(row.mock_test.trim().toLowerCase())) {
        errors.push(`Row ${index + 2}: mock_test does not match the selected mock.`);
      }
    });

    const firstNewNumber = existing.reduce((maximum, row) => Math.max(maximum, Number(row.question_number) || 0), 0) + 1;
    const rows = parsed.rows.map((row, index) => ({
      source_row: index + 2,
      question_number: firstNewNumber + index,
      question_text: row.question_text,
      option_a: row.option_a,
      option_b: row.option_b,
      option_c: row.option_c,
      option_d: row.option_d,
      correct_option: row.correct_option,
      explanation: row.explanation || null,
    }));
    const rowErrors = failedRowCount(errors);
    const data = {
      test: { id: test.id, title: test.title, main_category: test.main_category, subcategory: test.subcategory },
      existingCount: existing.length,
      detected: parsed.rows.length,
      validRowCount: Math.max(0, parsed.rows.length - rowErrors),
      failedRowCount: rowErrors,
      duplicateCount: errors.filter((error) => error.includes("already exists in")).length,
      errors,
      rows,
      totalAfterAppend: existing.length + parsed.rows.length,
    };

    if (action === "preview") return NextResponse.json({ data });
    if (errors.length) return NextResponse.json({ error: "Fix validation errors before appending questions.", errors, data }, { status: 400 });

    // A single bulk insert keeps this append atomic; unique(test_id, question_number)
    // also protects against concurrent imports. No MOCK_TESTS row is updated.
    const insertResponse = await serviceRequest("TEST_QUESTIONS", {
      method: "POST",
      headers: { Prefer: "return=representation,resolution=error" },
      body: JSON.stringify(rows.map(({ question_number, question_text, option_a, option_b, option_c, option_d, correct_option, explanation }) => ({
        test_id: test.id, question_number, question_text, option_a, option_b, option_c, option_d, correct_option, explanation,
      }))),
    });
    if (!insertResponse.ok) {
      const detail = await insertResponse.text().catch(() => "");
      return NextResponse.json({ error: insertResponse.status === 409 ? "Questions changed during validation. No questions were appended; validate again." : "Questions could not be appended. No mock settings were changed.", ...(process.env.NODE_ENV === "development" && detail ? { detail } : {}) }, { status: 502 });
    }
    const inserted = await insertResponse.json().catch(() => []) as unknown[];
    return NextResponse.json({ data: { testId: test.id, testTitle: test.title, imported: Array.isArray(inserted) ? inserted.length : rows.length, skipped: 0, existingBefore: existing.length, totalAfterAppend: existing.length + rows.length } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Question append failed." }, { status: 500 });
  }
}
