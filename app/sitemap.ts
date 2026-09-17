import type { MetadataRoute } from "next";
import { getPublishedCatalogTests } from "@/lib/test-catalog";
import { getAvailableFreePracticeSubjects } from "@/lib/free-subject-catalog";

const baseUrl = "https://jktestpoint.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [tests, freeSubjects] = await Promise.all([
    getPublishedCatalogTests().catch(() => []),
    getAvailableFreePracticeSubjects().catch(() => []),
  ]);
  const staticRoutes = ["/", "/mock-tests", "/pricing", "/about", "/contact", "/privacy", "/terms"];
  return [
    ...staticRoutes.map((path) => ({ url: `${baseUrl}${path}` })),
    ...tests.map((test) => ({ url: `${baseUrl}/mock-tests/${encodeURIComponent(test.id)}` })),
    ...freeSubjects.filter((subject) => subject.freeQuestionCount > 0).map((subject) => ({ url: `${baseUrl}/free-mcq-practice/${encodeURIComponent(subject.id)}` })),
  ];
}
