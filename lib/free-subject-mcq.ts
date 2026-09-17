import { getSupabaseConfig } from "@/lib/supabase";
import { getFreeSubjectDatabaseKey, getFreeSubjectDefinition } from "@/lib/free-subject-catalog";

export type PublicFreeSubjectQuestion = {
  id: string;
  subject: string;
  question_number: number;
  text: string;
  options: string[];
};

export async function getFreePublicSubjectQuestions(subject: string, accessToken: string): Promise<PublicFreeSubjectQuestion[]> {
  if (!getFreeSubjectDefinition(subject)) return [];
  const { url, key } = getSupabaseConfig();
  const params = new URLSearchParams({
    select: "id,subject,question_number,question_text,option_a,option_b,option_c,option_d",
    subject: `eq.${getFreeSubjectDatabaseKey(subject)}`,
    order: "question_number.asc,id.asc",
  });
  const response = await fetch(`${url}/rest/v1/FREE_MCQ_QUESTIONS?${params.toString()}`, {
    method: "GET",
    headers: {
      apikey: key,
      Authorization: `Bearer ${accessToken}`,
      "Accept-Profile": "public",
    },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Free subject question query failed (${response.status}).`);
  const rows = await response.json() as Array<{
    id: string;
    subject: string;
    question_number: number;
    question_text: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
  }>;
  return rows.map((row) => ({
    id: row.id,
    subject: row.subject,
    question_number: row.question_number,
    text: row.question_text,
    options: [row.option_a, row.option_b, row.option_c, row.option_d],
  }));
}
