import { getPublishedCatalogTests, type CatalogTest } from "@/lib/test-catalog";

export type FeaturedMockTest = CatalogTest;

export async function getFeaturedMockTests(): Promise<FeaturedMockTest[]> {
  // Featured cards intentionally come from the same published catalogue as
  // All Categories. The admin-controlled `featured` field is the only filter.
  return (await getPublishedCatalogTests()).filter((test) => test.featured);
}
