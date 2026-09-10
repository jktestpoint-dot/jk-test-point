import "server-only";

import { getUnifiedAttemptHistory, type AttemptHistoryItem } from "@/lib/attempt-history";

export type AnalyticsAttempt = Omit<AttemptHistoryItem, "resultUrl">;

export type StudentAttemptAnalytics = {
  attempts: AnalyticsAttempt[];
  summary: {
    totalAttempts: number;
    averagePercentage: number | null;
    bestPercentage: number | null;
    latestPercentage: number | null;
    attemptCountsByType: Record<AnalyticsAttempt["attemptType"], number>;
    questionMetricAttemptCount: number;
    totalQuestions: number | null;
    totalCorrect: number | null;
    totalIncorrect: number | null;
    totalUnattempted: number | null;
    recentPercentageTrend: Array<{
      attemptId: string;
      attemptType: AnalyticsAttempt["attemptType"];
      title: string;
      percentage: number;
      createdAt: string;
    }>;
  };
};

function sumOrNull(values: Array<number | null>) {
  const present = values.filter((value): value is number => value !== null);
  return present.length ? present.reduce((sum, value) => sum + value, 0) : null;
}

export async function getStudentAttemptAnalytics(accessToken: string, userId: string): Promise<StudentAttemptAnalytics> {
  const history = await getUnifiedAttemptHistory(accessToken, userId);
  const attempts: AnalyticsAttempt[] = history.map(({ resultUrl: _, ...attempt }) => attempt);
  const percentages = attempts.map((attempt) => attempt.percentage);
  const attemptsWithQuestionMetrics = attempts.filter((attempt) =>
    attempt.totalQuestions !== null
    && attempt.correct !== null
    && attempt.incorrect !== null
    && attempt.unattempted !== null,
  );

  const attemptCountsByType: StudentAttemptAnalytics["summary"]["attemptCountsByType"] = {
    mock: 0,
    paid_subject: 0,
    free_subject: 0,
  };
  for (const attempt of attempts) attemptCountsByType[attempt.attemptType] += 1;

  return {
    attempts,
    summary: {
      totalAttempts: attempts.length,
      averagePercentage: percentages.length
        ? Number((percentages.reduce((sum, percentage) => sum + percentage, 0) / percentages.length).toFixed(2))
        : null,
      bestPercentage: percentages.length ? Math.max(...percentages) : null,
      latestPercentage: attempts[0]?.percentage ?? null,
      attemptCountsByType,
      questionMetricAttemptCount: attemptsWithQuestionMetrics.length,
      totalQuestions: sumOrNull(attemptsWithQuestionMetrics.map((attempt) => attempt.totalQuestions)),
      totalCorrect: sumOrNull(attemptsWithQuestionMetrics.map((attempt) => attempt.correct)),
      totalIncorrect: sumOrNull(attemptsWithQuestionMetrics.map((attempt) => attempt.incorrect)),
      totalUnattempted: sumOrNull(attemptsWithQuestionMetrics.map((attempt) => attempt.unattempted)),
      recentPercentageTrend: attempts
        .slice(0, 10)
        .reverse()
        .map((attempt) => ({
          attemptId: attempt.attemptId,
          attemptType: attempt.attemptType,
          title: attempt.title,
          percentage: attempt.percentage,
          createdAt: attempt.createdAt,
        })),
    },
  };
}
