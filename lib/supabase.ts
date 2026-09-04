/**
 * Server-side Supabase REST client for the existing `students` table.
 * The publishable key is read from .env.local and never hard-coded.
 */
const studentsTable = process.env.SUPABASE_STUDENTS_TABLE || "STUDENTS";

export type Student = {
  id: string;
  [key: string]: unknown;
};

export type TestAttempt = {
  id: string;
  user_id: string;
  test_id: string | null;
  test_title: string | null;
  score: number;
  percentage: number;
  created_at: string;
};

export type DashboardProgress = { tests_done: number; accuracy: number; best_score: number; student_rank: number };

export function getSupabaseConfig() {
  // This module is imported exclusively by server-side API routes. Keep the
  // publishable key out of NEXT_PUBLIC_* variables and browser bundles.
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url) throw new Error("Supabase is not configured. Add SUPABASE_URL to the server environment.");
  if (!key) throw new Error("Supabase is not configured. Add SUPABASE_PUBLISHABLE_KEY to the server environment.");
  return { url, key };
}

export async function getStudents(limit = 50): Promise<Student[]> {
  const { url, key } = getSupabaseConfig();
  const response = await fetch(`${url}/rest/v1/${encodeURIComponent(studentsTable)}?select=*&limit=${limit}`, {
    // Supabase publishable keys authenticate through the apikey header. A
    // Bearer token is added only after a student signs in with Supabase Auth.
    headers: { apikey: key, "Accept-Profile": "public" },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Supabase students query failed (${response.status}).`);
  }
  return response.json() as Promise<Student[]>;
}

export async function getStudentAttempts(accessToken: string, userId: string): Promise<TestAttempt[]> {
  const { url, key } = getSupabaseConfig();
  const params = new URLSearchParams({ select: "*", user_id: `eq.${userId}`, order: "created_at.desc" });
  const response = await fetch(`${url}/rest/v1/TEST_ATTEMPTS?${params.toString()}`, {
    headers: { apikey: key, Authorization: `Bearer ${accessToken}`, "Accept-Profile": "public" },
    cache: "no-store"
  });
  if (!response.ok) throw new Error(`Supabase test attempts query failed (${response.status}).`);
  return response.json() as Promise<TestAttempt[]>;
}

export async function createStudentAttempt(accessToken: string, attempt: Omit<TestAttempt, "id" | "created_at">): Promise<TestAttempt> {
  const { url, key } = getSupabaseConfig();
  const response = await fetch(`${url}/rest/v1/TEST_ATTEMPTS`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", "Content-Profile": "public", Prefer: "return=representation" },
    body: JSON.stringify(attempt),
    cache: "no-store"
  });
  if (!response.ok) throw new Error(`Supabase test attempt save failed (${response.status}).`);
  const records = (await response.json()) as TestAttempt[];
  return records[0];
}

export async function getMyDashboardProgress(accessToken: string): Promise<DashboardProgress> {
  const { url, key } = getSupabaseConfig();
  const response = await fetch(`${url}/rest/v1/rpc/get_my_dashboard_progress`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", "Content-Profile": "public" },
    body: "{}",
    cache: "no-store"
  });
  if (!response.ok) throw new Error(`Supabase dashboard progress query failed (${response.status}).`);
  const rows = await response.json() as DashboardProgress[];
  return rows[0] || { tests_done: 0, accuracy: 0, best_score: 0, student_rank: 0 };
}
