import type { Metadata } from "next";
import MockTestsLibrary from "@/components/MockTestsLibrary";
import { MockTestCategoryPage, slugify } from "@/components/MockTestCategoryBrowser";
import { getPublishedCatalogTests } from "@/lib/test-catalog";
import { MAIN_CATEGORIES } from "@/lib/mock-test-types";

function labelFromSlug(value: string) {
  return decodeURIComponent(value).replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export async function generateMetadata({ params }: { params: { subcategory: string } }): Promise<Metadata> {
  const label = labelFromSlug(params.subcategory);
  const description = `Browse available ${label} mock tests and exam practice on JK Test Point.`;
  return {
    title: `${label} Mock Tests | JK Test Point`,
    description,
    alternates: { canonical: `/mock-tests/category/${encodeURIComponent(params.subcategory)}` },
    openGraph: { title: `${label} Mock Tests | JK Test Point`, description, url: `/mock-tests/category/${encodeURIComponent(params.subcategory)}`, type: "website" },
    twitter: { card: "summary", title: `${label} Mock Tests | JK Test Point`, description },
  };
}

export default async function MockTestCategoryRoute({ params }: { params: { subcategory: string } }) {
  try {
    const tests = await getPublishedCatalogTests();
    const category = MAIN_CATEGORIES.find((item) => slugify(item) === params.subcategory);
    if (category) return <MockTestCategoryPage category={category} tests={tests.filter((test) => test.main_category === category)} />;
    const filtered = tests.filter((test) => slugify(test.subcategory) === params.subcategory);
    return <MockTestsLibrary initialTests={filtered} />;
  } catch (error) {
    return <MockTestsLibrary initialTests={[]} initialError={error instanceof Error ? error.message : "Unable to load mock tests."} />;
  }
}
