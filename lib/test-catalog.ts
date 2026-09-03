import { getSupabaseConfig } from "@/lib/supabase";
import { MAIN_CATEGORIES, type CatalogTest, type MainCategory, type PublicTestQuestion } from "@/lib/mock-test-types";

export type { CatalogTest, MainCategory, PublicTestQuestion } from "@/lib/mock-test-types";
export { MAIN_CATEGORIES } from "@/lib/mock-test-types";

const table = "MOCK_TESTS";

function isCatalogTest(value: unknown): value is CatalogTest {
  if (!value || typeof value !== "object") return false;
  const test = value as Record<string, unknown>;
  return typeof test.id === "string" && typeof test.title === "string" &&
    MAIN_CATEGORIES.includes(test.main_category as MainCategory) &&
    typeof test.subcategory === "string" && test.subcategory.trim().length > 0 &&
    Number.isInteger(test.question_count) && (test.question_count as number) >= 0 &&
    Number.isInteger(test.duration_minutes) && (test.duration_minutes as number) >= 0 &&
    typeof test.price === "number" && typeof test.total_marks === "number" &&
    typeof test.negative_marking === "string" && typeof test.featured === "boolean";
}

async function getStoredQuestionCount(testId: string): Promise<number> {
  const { url, key } = getSupabaseConfig();
  const params = new URLSearchParams({
    select: "id",
    test_id: `eq.${testId}`,
  });
  const response = await fetch(`${url}/rest/v1/TEST_QUESTIONS?${params.toString()}`, {
    method: "HEAD",
    headers: {
      apikey: key,
      "Accept-Profile": "public",
      Prefer: "count=exact",
      Range: "0-0",
    },
    cache: "no-store",
  });

  const total = response.headers.get("content-range")?.match(/\/(\d+)$/)?.[1];
  if (!response.ok || total === undefined) {
    throw new Error(`Stored question-count query failed for test ${testId}.`);
  }

  return Number(total);
}

async function withStoredQuestionCounts(tests: CatalogTest[]): Promise<CatalogTest[]> {
  return Promise.all(
    tests.map(async (test) => {
      const questionCount = await getStoredQuestionCount(test.id);
      return {
        ...test,
        question_count: questionCount,
        duration_minutes: questionCount,
      };
    }),
  );
}

async function catalogRequest(path: string) {
  const { url, key } = getSupabaseConfig();
  const response = await fetch(`${url}/rest/v1/${table}${path}`, {
    headers: { apikey: key, "Accept-Profile": "public" },
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error(`Mock-test catalogue query failed (${response.status}). Apply the mock-test catalogue migration before using this endpoint.`);
  }
  return response.json() as Promise<unknown>;
}

export async function getPublishedCatalogTests(): Promise<CatalogTest[]> {
  const data = await catalogRequest("?select=id,title,main_category,subcategory,description,question_count,duration_minutes,price,total_marks,negative_marking,featured&published=eq.true&order=created_at.desc");
  const tests = Array.isArray(data) ? data.filter(isCatalogTest) : [];
  return withStoredQuestionCounts(tests);
}

export async function getPublishedCatalogTest(id: string): Promise<CatalogTest | null> {
  const params = new URLSearchParams({
    select: "id,title,main_category,subcategory,description,question_count,duration_minutes,price,total_marks,negative_marking,featured",
    published: "eq.true",
    id: `eq.${id}`,
    limit: "1"
  });
  const data = await catalogRequest(`?${params.toString()}`);
  if (!Array.isArray(data) || !isCatalogTest(data[0])) return null;
  const questionCount = await getStoredQuestionCount(data[0].id);
  return {
    ...data[0],
    question_count: questionCount,
    duration_minutes: questionCount,
  };
}

export async function getPublicTestQuestions(testId: string): Promise<PublicTestQuestion[]> {
  const { url, key } = getSupabaseConfig();
  const params = new URLSearchParams({ select: "id,question_number,question_text,option_a,option_b,option_c,option_d", test_id: `eq.${testId}`, order: "question_number.asc" });
  const response = await fetch(`${url}/rest/v1/TEST_QUESTIONS?${params.toString()}`, { headers: { apikey: key, "Accept-Profile": "public" }, cache: "no-store" });
  if (!response.ok) throw new Error(`Test questions query failed (${response.status}).`);
  const rows = await response.json() as Array<{ id: string; question_number: number; question_text: string; option_a: string; option_b: string; option_c: string; option_d: string }>;
  return rows.map((row) => ({ id: row.id, question_number: row.question_number, text: row.question_text, options: [row.option_a, row.option_b, row.option_c, row.option_d] }));
}
