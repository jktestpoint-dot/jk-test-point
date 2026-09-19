import "server-only";

import { getSupabaseConfig } from "@/lib/supabase";

async function countRows(table: string, query = "") {
  const { url } = getSupabaseConfig();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return null;
  const response = await fetch(`${url}/rest/v1/${encodeURIComponent(table)}?select=id${query}`, {
    method: "HEAD",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Accept-Profile": "public",
      Prefer: "count=exact",
      Range: "0-0",
    },
    cache: "no-store",
  });
  if (!response.ok) return null;
  const total = response.headers.get("content-range")?.match(/\/(\d+)$/)?.[1];
  return total === undefined ? null : Number(total);
}

export async function getHomepageStats() {
  const [paidQuestions, freeQuestions, mockQuestions, publishedMocks, students] = await Promise.all([
    countRows("SUBJECT_MCQ_QUESTIONS"),
    countRows("FREE_MCQ_QUESTIONS"),
    countRows("TEST_QUESTIONS"),
    countRows("MOCK_TESTS", "&published=eq.true"),
    countRows("STUDENTS"),
  ]);
  const questionCounts = [paidQuestions, freeQuestions, mockQuestions];
  return {
    questions: questionCounts.every((count) => count !== null) ? questionCounts.reduce((sum, count) => sum + (count || 0), 0) : null,
    mockTests: publishedMocks,
    students,
  };
}
