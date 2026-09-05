import { getSupabaseConfig } from "@/lib/supabase";
import { getMcqPracticeSubject } from "@/lib/mcq-practice";

export type PublicSubjectQuestion = { id: string; question_number: number; text: string; options: string[] };

export async function getPublicSubjectQuestions(subject: string): Promise<PublicSubjectQuestion[]> {
  if (!getMcqPracticeSubject(subject)) return [];
  const { url, key } = getSupabaseConfig();
  const params = new URLSearchParams({ select: "id,question_number,question_text,option_a,option_b,option_c,option_d", subject: `eq.${subject}`, order: "question_number.asc" });
  const response = await fetch(`${url}/rest/v1/SUBJECT_MCQ_QUESTIONS?${params.toString()}`, { headers: { apikey: key, "Accept-Profile": "public" }, cache: "no-store" });
  if (!response.ok) throw new Error(`Subject question query failed (${response.status}).`);
  const rows = await response.json() as Array<{ id: string; question_number: number; question_text: string; option_a: string; option_b: string; option_c: string; option_d: string }>;
  return rows.map((row) => ({ id: row.id, question_number: row.question_number, text: row.question_text, options: [row.option_a, row.option_b, row.option_c, row.option_d] }));
}

export async function getSubjectQuestionCount(subject: string): Promise<number> {
  if (!getMcqPracticeSubject(subject)) return 0;
  const { url, key } = getSupabaseConfig();
  const params = new URLSearchParams({ select: "id", subject: `eq.${subject}` });
  const response = await fetch(`${url}/rest/v1/SUBJECT_MCQ_QUESTIONS?${params.toString()}`, { method: "HEAD", headers: { apikey: key, "Accept-Profile": "public", Prefer: "count=exact", Range: "0-0" }, cache: "no-store" });
  const count = response.headers.get("content-range")?.match(/\/(\d+)$/)?.[1];
  if (!response.ok || count === undefined) throw new Error(`Subject question-count query failed (${response.status}).`);
  return Number(count);
}
