import "server-only";

import { MCQ_PRACTICE_SUBJECTS } from "@/lib/mcq-practice";

export type FreePracticeSubject = {
  id: string;
  name: string;
  mcqCount: number;
  price: number;
  freeQuestionCount: number;
};

const APPROVED_FREE_SUBJECTS = [
  ["jk-gk", "J&K GK"],
  ["general-knowledge", "General Knowledge"],
  ["mathematics", "Mathematics"],
  ["reasoning", "Reasoning"],
  ["english", "English"],
  ["general-science", "General Science"],
  ["computer", "Computer"],
  ["indian-polity", "Indian Polity"],
  ["history", "History"],
  ["geography", "Geography"],
  ["accountancy", "Accountancy"],
] as const;

/**
 * Homepage discovery only: exposes an active mapping count, never question
 * identifiers, content, options, answers, or a service credential.
 */
export async function getAvailableFreePracticeSubjects(): Promise<FreePracticeSubject[]> {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return [];

  const response = await fetch(`${url}/rest/v1/FREE_SUBJECT_MCQ_QUESTIONS?select=subject&is_active=eq.true`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Accept-Profile": "public" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Unable to load free-practice availability.");

  const counts = new Map<string, number>();
  for (const row of await response.json() as Array<{ subject?: unknown }>) {
    if (typeof row.subject === "string") counts.set(row.subject, (counts.get(row.subject) || 0) + 1);
  }
  return APPROVED_FREE_SUBJECTS.map(([id, name]) => {
    const configured = MCQ_PRACTICE_SUBJECTS.find((subject) => subject.id === id);
    return {
      id,
      name,
      mcqCount: configured?.mcqCount || 0,
      price: configured?.price || 0,
      freeQuestionCount: counts.get(id) || 0,
    };
  });
}
