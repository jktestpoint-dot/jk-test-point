import type { MetadataRoute } from "next";
import { getPublishedCatalogTests, MAIN_CATEGORIES } from "@/lib/test-catalog";
import { MCQ_PRACTICE_SUBJECTS } from "@/lib/mcq-practice";

const baseUrl = "https://jktestpoint.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const tests = await getPublishedCatalogTests().catch(() => []);
  const staticRoutes = ["/", "/mock-tests", "/mcq-practice", "/free-mcq-practice", "/pricing", "/about", "/contact", "/privacy", "/terms"];
  const categorySlugs = new Set([
    ...MAIN_CATEGORIES,
    ...tests.map((test) => test.subcategory),
  ].map((label) => label.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")));
  return [
    ...staticRoutes.map((path) => ({ url: `${baseUrl}${path}` })),
    ...Array.from(categorySlugs).map((slug) => ({ url: `${baseUrl}/mock-tests/category/${encodeURIComponent(slug)}` })),
    ...tests.map((test) => ({ url: `${baseUrl}/mock-tests/${encodeURIComponent(test.id)}` })),
    ...MCQ_PRACTICE_SUBJECTS.map((subject) => ({ url: `${baseUrl}/mcq-practice/${encodeURIComponent(subject.id)}` })),
  ];
}
