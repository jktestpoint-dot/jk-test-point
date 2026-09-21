import type { Metadata } from "next";
import MockTestsLibrary from "@/components/MockTestsLibrary";
import { getPublishedCatalogTests } from "@/lib/test-catalog";

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function labelFromSlug(value: string) {
  return decodeURIComponent(value).replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export async function generateMetadata({ params }: { params: { subcategory: string } }): Promise<Metadata> {
  const label = labelFromSlug(params.subcategory);
  return { title: `${label} Mock Tests | JK Test Point`, description: `Browse published JKSSB ${label} mock tests on JK Test Point.` };
}

export default async function MockTestSubcategoryPage({ params }: { params: { subcategory: string } }) {
  try {
    const tests = await getPublishedCatalogTests();
    const filtered = tests.filter((test) => test.main_category === "JKSSB" && slugify(test.subcategory) === params.subcategory);
    return <MockTestsLibrary initialTests={filtered} />;
  } catch (error) {
    return <MockTestsLibrary initialTests={[]} initialError={error instanceof Error ? error.message : "Unable to load mock tests."} />;
  }
}
