import MockTestsLibrary from "@/components/MockTestsLibrary";
import { getPublishedCatalogTests } from "@/lib/test-catalog";

export default async function MockTestsPage() {
  try {
    return <MockTestsLibrary initialTests={await getPublishedCatalogTests()} />;
  } catch (error) {
    return <MockTestsLibrary initialTests={[]} initialError={error instanceof Error ? error.message : "Unable to load mock tests."} />;
  }
}
