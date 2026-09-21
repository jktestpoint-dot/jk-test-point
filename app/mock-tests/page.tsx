import type { Metadata } from "next";
import { MockTestCategoryIndex } from "@/components/MockTestCategoryBrowser";

export const metadata: Metadata = {
  title: "JKSSB Mock Tests | Online Practice Tests",
  description: "Browse published JKSSB and competitive-exam mock tests with question counts, time limits and access details on JK Test Point.",
  alternates: { canonical: "/mock-tests" },
  openGraph: {
    title: "JKSSB Mock Tests | Online Practice Tests",
    description: "Browse published JKSSB and competitive-exam mock tests with question counts, time limits and access details.",
    url: "/mock-tests",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "JKSSB Mock Tests | Online Practice Tests",
    description: "Browse published JKSSB and competitive-exam mock tests with question counts, time limits and access details.",
  },
};

export default async function MockTestsPage() {
  return <MockTestCategoryIndex />;
}
