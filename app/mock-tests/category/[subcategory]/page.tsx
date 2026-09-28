import type { Metadata } from "next";
import { notFound } from "next/navigation";
import MockTestsLibrary from "@/components/MockTestsLibrary";
import { MockTestCategoryPage, slugify } from "@/components/MockTestCategoryBrowser";
import { getPublishedCatalogTests } from "@/lib/test-catalog";
import { MAIN_CATEGORIES } from "@/lib/mock-test-types";

function labelFromSlug(value: string) {
  return decodeURIComponent(value).replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export async function generateMetadata({ params }: { params: { subcategory: string } }): Promise<Metadata> {
  const tests = await getPublishedCatalogTests().catch(() => []);
  const category = MAIN_CATEGORIES.find((item) => slugify(item) === params.subcategory);
  const matchingTests = category
    ? tests.filter((test) => test.main_category === category)
    : tests.filter((test) => slugify(test.subcategory) === params.subcategory);
  if (!category && matchingTests.length === 0) return { robots: { index: false, follow: false } };
  const label = category || matchingTests[0]?.subcategory || labelFromSlug(params.subcategory);
  const description = `Browse available ${label} mock tests and exam practice on JK Test Point.`;
  return {
    title: `${label} Mock Tests`,
    description,
    alternates: { canonical: `/mock-tests/category/${encodeURIComponent(params.subcategory)}` },
    robots: matchingTests.some((test) => test.question_count > 0) ? undefined : { index: false, follow: true },
    openGraph: { title: `${label} Mock Tests`, description, url: `/mock-tests/category/${encodeURIComponent(params.subcategory)}`, type: "website" },
    twitter: { card: "summary", title: `${label} Mock Tests`, description },
  };
}

export default async function MockTestCategoryRoute({ params }: { params: { subcategory: string } }) {
  const result = await getPublishedCatalogTests()
    .then((tests) => ({ tests, error: null as Error | null }))
    .catch((error: unknown) => ({ tests: null, error: error instanceof Error ? error : new Error("Unable to load mock tests.") }));
  if (!result.tests) return <MockTestsLibrary initialTests={[]} initialError={result.error?.message || "Unable to load mock tests."} />;

  const category = MAIN_CATEGORIES.find((item) => slugify(item) === params.subcategory);
  if (category) return <MockTestCategoryPage category={category} tests={result.tests.filter((test) => test.main_category === category)} />;
  const filtered = result.tests.filter((test) => slugify(test.subcategory) === params.subcategory);
  if (!filtered.length) return notFound();
  return <MockTestsLibrary initialTests={filtered} />;
}
