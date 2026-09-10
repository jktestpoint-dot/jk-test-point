import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  getAuthenticatedStudent,
  refreshStudentSession,
} from "@/lib/supabase-auth";
import { getSupabaseConfig } from "@/lib/supabase";
import { getMcqPracticeSubject } from "@/lib/mcq-practice";
import { getFreePublicSubjectQuestions } from "@/lib/free-subject-mcq";
import { getPublicSubjectQuestions } from "@/lib/subject-mcq";
import { hasActiveSubjectEntitlement } from "@/lib/subject-entitlement";
import { getPublishedCatalogTest, getPublicTestQuestions } from "@/lib/test-catalog";

type SourceType = "mock" | "subject";
type BookmarkTarget = {
  sourceType: SourceType;
  sourceKey: string;
  questionNumber: number;
};
type Bookmark = {
  id: string;
  source_type: SourceType;
  source_key: string;
  question_number: number;
  created_at: string;
  updated_at: string;
};
type SafeQuestion = { text: string; options: string[] };
type BookmarkListItem = Bookmark & { source_label: string; question: SafeQuestion | null };
type BookmarkSource = { label: string; questions: Array<{ question_number: number; text: string; options: string[] }> };

class BookmarkError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

async function getSession() {
  const store = cookies();
  let accessToken = store.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = store.get(REFRESH_TOKEN_COOKIE)?.value;
  let user = accessToken ? await getAuthenticatedStudent(accessToken) : null;
  let refreshed: Awaited<ReturnType<typeof refreshStudentSession>> = null;

  if (!user && refreshToken) {
    refreshed = await refreshStudentSession(refreshToken);
    if (refreshed) {
      accessToken = refreshed.accessToken;
      user = await getAuthenticatedStudent(accessToken);
    }
  }

  return { accessToken, user, refreshed };
}

function withRefreshedSession(response: NextResponse, refreshed: Awaited<ReturnType<typeof refreshStudentSession>>) {
  if (!refreshed) return response;
  const options = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
  response.cookies.set(ACCESS_TOKEN_COOKIE, refreshed.accessToken, options);
  response.cookies.set(REFRESH_TOKEN_COOKIE, refreshed.refreshToken, options);
  return response;
}

function readTarget(value: unknown): BookmarkTarget {
  if (!value || typeof value !== "object") throw new BookmarkError(400, "A bookmark target is required.");
  const input = value as { source_type?: unknown; source_key?: unknown; question_number?: unknown };
  if (input.source_type !== "mock" && input.source_type !== "subject") {
    throw new BookmarkError(400, "source_type must be mock or subject.");
  }
  if (typeof input.source_key !== "string" || !input.source_key.trim()) {
    throw new BookmarkError(400, "A valid source_key is required.");
  }
  if (!Number.isInteger(input.question_number) || (input.question_number as number) < 1) {
    throw new BookmarkError(400, "question_number must be a positive integer.");
  }
  return {
    sourceType: input.source_type,
    sourceKey: input.source_key.trim(),
    questionNumber: input.question_number as number,
  };
}

function bookmarkHeaders(accessToken: string) {
  const { key } = getSupabaseConfig();
  return { apikey: key, Authorization: `Bearer ${accessToken}`, "Accept-Profile": "public" };
}

async function validateMockTarget(target: BookmarkTarget, accessToken: string) {
  const { url } = getSupabaseConfig();
  const testParams = new URLSearchParams({ select: "id", id: `eq.${target.sourceKey}`, published: "eq.true", limit: "1" });
  const testResponse = await fetch(`${url}/rest/v1/MOCK_TESTS?${testParams.toString()}`, {
    headers: bookmarkHeaders(accessToken),
    cache: "no-store",
  });
  const tests = await testResponse.json().catch(() => null) as Array<{ id: string }> | null;
  if (!testResponse.ok) throw new BookmarkError(503, "Unable to validate this mock test.");
  if (!tests?.length) throw new BookmarkError(404, "This mock test is not available.");

  const questionParams = new URLSearchParams({
    select: "id",
    test_id: `eq.${target.sourceKey}`,
    question_number: `eq.${target.questionNumber}`,
    limit: "1",
  });
  const questionResponse = await fetch(`${url}/rest/v1/TEST_QUESTIONS?${questionParams.toString()}`, {
    headers: bookmarkHeaders(accessToken),
    cache: "no-store",
  });
  const questions = await questionResponse.json().catch(() => null) as Array<{ id: string }> | null;
  if (!questionResponse.ok) throw new BookmarkError(503, "Unable to validate this question.");
  if (!questions?.length) throw new BookmarkError(404, "Question not found for this mock test.");
}

async function validateSubjectTarget(target: BookmarkTarget, accessToken: string) {
  if (!getMcqPracticeSubject(target.sourceKey)) {
    throw new BookmarkError(400, "Invalid subject.");
  }

  const entitled = await hasActiveSubjectEntitlement(accessToken, target.sourceKey);
  const questions = entitled
    ? await getPublicSubjectQuestions(target.sourceKey, accessToken)
    : await getFreePublicSubjectQuestions(target.sourceKey, accessToken);

  if (questions.some((question) => question.question_number === target.questionNumber)) return;
  if (!entitled) {
    throw new BookmarkError(403, "This question is not available to your account.");
  }
  throw new BookmarkError(404, "Question not found for this subject.");
}

async function validateTarget(target: BookmarkTarget, accessToken: string) {
  if (target.sourceType === "mock") {
    await validateMockTarget(target, accessToken);
    return;
  }
  await validateSubjectTarget(target, accessToken);
}

function bookmarkParams(userId: string, target?: BookmarkTarget) {
  const params = new URLSearchParams({
    select: "id,source_type,source_key,question_number,created_at,updated_at",
    user_id: `eq.${userId}`,
    order: "created_at.desc",
  });
  if (target) {
    params.set("source_type", `eq.${target.sourceType}`);
    params.set("source_key", `eq.${target.sourceKey}`);
    params.set("question_number", `eq.${target.questionNumber}`);
  }
  return params;
}

async function readBookmarks(accessToken: string, userId: string, target?: BookmarkTarget) {
  const { url } = getSupabaseConfig();
  const response = await fetch(`${url}/rest/v1/user_question_bookmarks?${bookmarkParams(userId, target).toString()}`, {
    headers: bookmarkHeaders(accessToken),
    cache: "no-store",
  });
  const data = await response.json().catch(() => null) as Bookmark[] | null;
  if (!response.ok) throw new BookmarkError(503, "Unable to load bookmarks.");
  return Array.isArray(data) ? data : [];
}

async function getBookmarkSources(bookmarks: Bookmark[], accessToken: string) {
  const sourceKeys = Array.from(new Set(bookmarks.map((bookmark) => `${bookmark.source_type}:${bookmark.source_key}`)));
  const sources: Array<[string, BookmarkSource]> = await Promise.all(sourceKeys.map(async (key): Promise<[string, BookmarkSource]> => {
    const [sourceType, sourceKey] = key.split(":", 2) as [SourceType, string];
    try {
      if (sourceType === "mock") {
        const test = await getPublishedCatalogTest(sourceKey);
        if (!test) return [key, { label: "Mock test", questions: [] }];
        const questions = await getPublicTestQuestions(sourceKey);
        return [key, { label: test.title, questions }];
      }

      const subject = getMcqPracticeSubject(sourceKey);
      if (!subject) return [key, { label: "Subject practice", questions: [] }];
      const entitled = await hasActiveSubjectEntitlement(accessToken, sourceKey);
      const questions = entitled
        ? await getPublicSubjectQuestions(sourceKey, accessToken)
        : await getFreePublicSubjectQuestions(sourceKey, accessToken);
      return [key, { label: subject.name, questions }];
    } catch {
      return [key, { label: sourceType === "mock" ? "Mock test" : "Subject practice", questions: [] }];
    }
  }));
  return new Map(sources);
}

async function addSafeQuestionMetadata(bookmarks: Bookmark[], accessToken: string): Promise<BookmarkListItem[]> {
  const sources = await getBookmarkSources(bookmarks, accessToken);
  return bookmarks.map((bookmark) => {
    const source = sources.get(`${bookmark.source_type}:${bookmark.source_key}`);
    const question = source?.questions.find((item) => item.question_number === bookmark.question_number);
    return {
      ...bookmark,
      source_label: source?.label || (bookmark.source_type === "mock" ? "Mock test" : "Subject practice"),
      question: question ? { text: question.text, options: question.options } : null,
    };
  });
}

function targetFromSearchParams(searchParams: URLSearchParams) {
  const hasAnyTargetParam = ["source_type", "source_key", "question_number"].some((key) => searchParams.has(key));
  if (!hasAnyTargetParam) return null;
  return readTarget({
    source_type: searchParams.get("source_type"),
    source_key: searchParams.get("source_key"),
    question_number: Number(searchParams.get("question_number")),
  });
}

function apiError(error: unknown) {
  if (error instanceof BookmarkError) return NextResponse.json({ error: error.message }, { status: error.status });
  return NextResponse.json({ error: "Unable to process bookmarks." }, { status: 503 });
}

export async function GET(request: NextRequest) {
  const { accessToken, user, refreshed } = await getSession();
  if (!accessToken || !user) return NextResponse.json({ error: "Please log in to manage bookmarks." }, { status: 401 });

  try {
    const target = targetFromSearchParams(request.nextUrl.searchParams);
    if (target) await validateTarget(target, accessToken);
    const bookmarks = await readBookmarks(accessToken, user.id, target || undefined);
    const data = target
      ? { bookmarked: bookmarks.length > 0, bookmark: bookmarks[0] || null }
      : await addSafeQuestionMetadata(bookmarks, accessToken);
    return withRefreshedSession(NextResponse.json({ data }), refreshed);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  const { accessToken, user, refreshed } = await getSession();
  if (!accessToken || !user) return NextResponse.json({ error: "Please log in to manage bookmarks." }, { status: 401 });

  try {
    const target = readTarget(await request.json().catch(() => null));
    await validateTarget(target, accessToken);
    const { url } = getSupabaseConfig();
    const response = await fetch(
      `${url}/rest/v1/user_question_bookmarks?on_conflict=user_id,source_type,source_key,question_number`,
      {
        method: "POST",
        headers: {
          ...bookmarkHeaders(accessToken),
          "Content-Type": "application/json",
          "Content-Profile": "public",
          Prefer: "resolution=ignore-duplicates",
        },
        body: JSON.stringify({
          user_id: user.id,
          source_type: target.sourceType,
          source_key: target.sourceKey,
          question_number: target.questionNumber,
        }),
        cache: "no-store",
      },
    );
    if (!response.ok) throw new BookmarkError(503, "Unable to save this bookmark.");
    const bookmarks = await readBookmarks(accessToken, user.id, target);
    return withRefreshedSession(NextResponse.json({ data: bookmarks[0] || null }, { status: 201 }), refreshed);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  const { accessToken, user, refreshed } = await getSession();
  if (!accessToken || !user) return NextResponse.json({ error: "Please log in to manage bookmarks." }, { status: 401 });

  try {
    const target = readTarget(await request.json().catch(() => null));
    const { url } = getSupabaseConfig();
    const params = new URLSearchParams({
      user_id: `eq.${user.id}`,
      source_type: `eq.${target.sourceType}`,
      source_key: `eq.${target.sourceKey}`,
      question_number: `eq.${target.questionNumber}`,
    });
    const response = await fetch(`${url}/rest/v1/user_question_bookmarks?${params.toString()}`, {
      method: "DELETE",
      headers: { ...bookmarkHeaders(accessToken), "Content-Profile": "public", Prefer: "return=representation" },
      cache: "no-store",
    });
    const deleted = await response.json().catch(() => null) as Bookmark[] | null;
    if (!response.ok) throw new BookmarkError(503, "Unable to remove this bookmark.");
    return withRefreshedSession(NextResponse.json({ data: { deleted: Array.isArray(deleted) && deleted.length > 0 } }), refreshed);
  } catch (error) {
    return apiError(error);
  }
}
