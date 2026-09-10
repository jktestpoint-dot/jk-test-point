import "server-only";

import { getSupabaseConfig } from "@/lib/supabase";
import { getMcqPracticeSubject } from "@/lib/mcq-practice";

export type AttemptHistoryItem = {
  attemptId: string;
  attemptType: "mock" | "paid_subject" | "free_subject";
  title: string;
  subject: string | null;
  score: number;
  percentage: number;
  totalQuestions: number | null;
  totalMarks: number | null;
  correct: number | null;
  incorrect: number | null;
  unattempted: number | null;
  createdAt: string;
  resultUrl: string;
};

type MockAttemptRow = {
  id: string;
  test_id: string | null;
  test_title: string | null;
  score: number;
  percentage: number;
  total_marks: number | null;
  created_at: string;
};

type SubjectAttemptRow = {
  id: string;
  subject: string;
  score: number;
  percentage: number;
  total_questions: number;
  correct: number;
  incorrect: number;
  unattempted: number;
  created_at: string;
};

async function readRows<T>(table: string, select: string, accessToken: string, userId: string) {
  const { url, key } = getSupabaseConfig();
  const query = new URLSearchParams({
    select,
    user_id: `eq.${userId}`,
    order: "created_at.desc",
  });
  const response = await fetch(`${url}/rest/v1/${table}?${query.toString()}`, {
    headers: { apikey: key, Authorization: `Bearer ${accessToken}`, "Accept-Profile": "public" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Unable to load your attempt history.");
  return response.json() as Promise<T[]>;
}

function subjectTitle(subjectId: string) {
  return getMcqPracticeSubject(subjectId)?.name || subjectId;
}

export async function getUnifiedAttemptHistory(accessToken: string, userId: string): Promise<AttemptHistoryItem[]> {
  const [mockAttempts, paidSubjectAttempts, freeSubjectAttempts] = await Promise.all([
    readRows<MockAttemptRow>(
      "TEST_ATTEMPTS",
      "id,test_id,test_title,score,percentage,total_marks,created_at",
      accessToken,
      userId,
    ),
    readRows<SubjectAttemptRow>(
      "SUBJECT_MCQ_ATTEMPTS",
      "id,subject,score,percentage,total_questions,correct,incorrect,unattempted,created_at",
      accessToken,
      userId,
    ),
    readRows<SubjectAttemptRow>(
      "FREE_SUBJECT_MCQ_ATTEMPTS",
      "id,subject,score,percentage,total_questions,correct,incorrect,unattempted,created_at",
      accessToken,
      userId,
    ),
  ]);

  const history: AttemptHistoryItem[] = [
    ...mockAttempts.map((attempt) => ({
      attemptId: attempt.id,
      attemptType: "mock" as const,
      title: attempt.test_title || "Mock test",
      subject: null,
      score: Number(attempt.score),
      percentage: Number(attempt.percentage),
      totalQuestions: null,
      totalMarks: attempt.total_marks === null ? null : Number(attempt.total_marks),
      correct: null,
      incorrect: null,
      unattempted: null,
      createdAt: attempt.created_at,
      resultUrl: `/results?attempt=${encodeURIComponent(attempt.id)}`,
    })),
    ...paidSubjectAttempts.map((attempt) => ({
      attemptId: attempt.id,
      attemptType: "paid_subject" as const,
      title: `${subjectTitle(attempt.subject)} MCQ Practice`,
      subject: attempt.subject,
      score: Number(attempt.score),
      percentage: Number(attempt.percentage),
      totalQuestions: Number(attempt.total_questions),
      totalMarks: Number(attempt.total_questions),
      correct: Number(attempt.correct),
      incorrect: Number(attempt.incorrect),
      unattempted: Number(attempt.unattempted),
      createdAt: attempt.created_at,
      resultUrl: `/mcq-practice/${encodeURIComponent(attempt.subject)}/results?attempt=${encodeURIComponent(attempt.id)}`,
    })),
    ...freeSubjectAttempts.map((attempt) => ({
      attemptId: attempt.id,
      attemptType: "free_subject" as const,
      title: `${subjectTitle(attempt.subject)} Free MCQ Practice`,
      subject: attempt.subject,
      score: Number(attempt.score),
      percentage: Number(attempt.percentage),
      totalQuestions: Number(attempt.total_questions),
      totalMarks: Number(attempt.total_questions),
      correct: Number(attempt.correct),
      incorrect: Number(attempt.incorrect),
      unattempted: Number(attempt.unattempted),
      createdAt: attempt.created_at,
      resultUrl: `/free-mcq-practice/${encodeURIComponent(attempt.subject)}/results?attempt=${encodeURIComponent(attempt.id)}`,
    })),
  ];

  return history.sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
}
