import { getSupabaseConfig } from "@/lib/supabase";
import { getMcqPracticeSubject } from "@/lib/mcq-practice";

export type PublicFreeSubjectQuestion = {
  id: string;
  subject: string;
  question_number: number;
  text: string;
  options: string[];
};

export async function getFreePublicSubjectQuestions(subject: string, accessToken: string): Promise<PublicFreeSubjectQuestion[]> {
  if (!getMcqPracticeSubject(subject)) return [];
  const { url, key } = getSupabaseConfig();
  const response = await fetch(`${url}/rest/v1/rpc/get_free_subject_mcq_questions`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Content-Profile": "public",
    },
    body: JSON.stringify({ p_subject: subject }),
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
