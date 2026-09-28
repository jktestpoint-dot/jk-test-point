import type { MetadataRoute } from "next";
import { getPublishedCatalogTests } from "@/lib/test-catalog";
import { MCQ_PRACTICE_SUBJECTS } from "@/lib/mcq-practice";
import { getAvailableFreePracticeSubjects } from "@/lib/free-subject-catalog";
import { getSubjectQuestionCount } from "@/lib/subject-mcq";

const baseUrl = "https://jktestpoint.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [tests, freeSubjects, paidSubjectCounts] = await Promise.all([
    getPublishedCatalogTests().catch(() => []),
    getAvailableFreePracticeSubjects().catch(() => []),
    Promise.all(MCQ_PRACTICE_SUBJECTS.map(async (subject) => ({
      id: subject.id,
      count: await getSubjectQuestionCount(subject.id).catch(() => 0),
    }))),
  ]);
  const indexableTests = tests.filter((test) => test.question_count > 0);
  const staticRoutes = ["/", "/mock-tests", "/mcq-practice", "/free-mcq-practice", "/pricing", "/about", "/contact", "/privacy", "/terms"];
  const categorySlugs = new Set([
    ...indexableTests.map((test) => test.main_category),
    ...indexableTests.map((test) => test.subcategory),
  ].map((label) => label.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")));
  const indexablePaidSubjectIds = new Set(paidSubjectCounts.filter(({ count }) => count > 0).map(({ id }) => id));
  return [
    ...staticRoutes.map((path) => ({ url: `${baseUrl}${path}` })),
    ...Array.from(categorySlugs).map((slug) => ({ url: `${baseUrl}/mock-tests/category/${encodeURIComponent(slug)}` })),
    ...indexableTests.map((test) => ({ url: `${baseUrl}/mock-tests/${encodeURIComponent(test.id)}` })),
    ...MCQ_PRACTICE_SUBJECTS.filter((subject) => indexablePaidSubjectIds.has(subject.id)).map((subject) => ({ url: `${baseUrl}/mcq-practice/${encodeURIComponent(subject.id)}` })),
    ...freeSubjects.filter((subject) => subject.freeQuestionCount > 0).map((subject) => ({ url: `${baseUrl}/free-mcq-practice/${encodeURIComponent(subject.id)}` })),
  ];
}
