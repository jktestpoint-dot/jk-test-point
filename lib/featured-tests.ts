import { getSupabaseConfig } from "@/lib/supabase";

export type FeaturedMockTest = {
  id: string;
  title: string;
  main_category: string;
  subcategory: string;
  question_count: number;
  duration_minutes: number;
  price: number;
};

function isFeaturedMockTest(value: unknown): value is FeaturedMockTest {
  if (!value || typeof value !== "object") return false;
  const test = value as Record<string, unknown>;
  return typeof test.id === "string" && typeof test.title === "string" &&
    typeof test.main_category === "string" && typeof test.subcategory === "string" &&
    typeof test.question_count === "number" && typeof test.duration_minutes === "number" &&
    typeof test.price === "number";
}

export async function getFeaturedMockTests(): Promise<FeaturedMockTest[]> {
  const { url, key } = getSupabaseConfig();
  const query = new URLSearchParams({
    select: "id,title,main_category,subcategory,question_count,duration_minutes,price",
    published: "eq.true",
    featured: "eq.true",
    order: "created_at.desc",
  });
  const response = await fetch(`${url}/rest/v1/MOCK_TESTS?${query.toString()}`, {
    headers: { apikey: key, "Accept-Profile": "public" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Unable to load featured mock tests.");
  const data = await response.json() as unknown;
  return Array.isArray(data) ? data.filter(isFeaturedMockTest) : [];
}
